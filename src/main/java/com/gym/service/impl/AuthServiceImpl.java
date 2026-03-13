package com.gym.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.gym.common.ErrorCode;
import com.gym.common.exception.BizException;
import com.gym.entity.User;
import com.gym.mapper.UserMapper;
import com.gym.service.AuthService;
import com.gym.service.VerifyCodeService;
import com.gym.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * ============================================
 * 认证服务实现类
 * ============================================
 * 作用：
 * 处理用户认证相关的业务逻辑，包括登录、注册、验证码登录等
 * 
 * 架构位置：
 * Controller(接收请求) 
 *     ↓
 * Service(业务逻辑)  ← 当前类所在位置
 *     ↓
 * Mapper(数据访问)
 *     ↓
 * 数据库
 * 
 * 注解说明：
 * @Service - 声明这是一个 Spring 服务类
 *           Spring 会自动扫描并管理这个类的实例
 *           可以通过 @Autowired 或构造函数注入使用
 * 
 * @RequiredArgsConstructor - Lombok 注解，自动生成包含 final 字段的构造函数
 *                           用于注入依赖（密码编码器、JWT工具、Mapper等）
 *                           优点：不需要写 @Autowired 注解，代码更简洁
 * ============================================
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    /**
     * 密码编码器 - 用于加密和验证密码
     * 实现：BCrypt 哈希算法
     * 特点：
     * - 单向哈希，无法反向解密
     * - 每次加密结果不同，包含随机盐
     * - 验证时需要原密码和存储的哈希值
     * 
     * 使用示例：
     * String hashed = passwordEncoder.encode("123456");  // 加密
     * boolean match = passwordEncoder.matches("123456", hashed);  // 验证
     */
    private final PasswordEncoder passwordEncoder;
    
    /**
     * JWT工具类 - 用于生成和解析 JWT Token
     * JWT Token 结构：header.payload.signature
     * payload 中包含：userId, 签发时间, 过期时间
     */
    private final JwtUtils jwtUtils;
    
    /**
     * 用户 Mapper - 用于数据库操作
     * 通过 MyBatis Plus 实现，提供增删改查方法
     */
    private final UserMapper userMapper;
    
    /**
     * 验证码服务 - 用于发送和验证短信验证码
     * 验证码存储在 Redis 中，有效期 5 分钟
     */
    private final VerifyCodeService verifyCodeService;

    /**
     * 密码登录
     * 
     * 业务流程：
     * 1. 校验参数是否为空
     * 2. 根据手机号查询用户
     * 3. 验证密码是否正确
     * 4. 生成 JWT Token 并返回
     * 
     * 安全考虑：
     * - 不能告知用户是"用户不存在"还是"密码错误"，统一返回"账号或密码错误"
     * - 防止恶意用户通过返回信息猜测用户是否存在
     * 
     * 异常情况：
     * - 参数为空：抛出 BAD_REQUEST 异常
     * - 用户不存在或密码错误：抛出 UNAUTHORIZED 异常
     * 
     * @param phone    手机号
     * @param password 原始密码（未加密）
     * @return JWT Token 字符串
     * @throws BizException 登录失败时抛出业务异常
     */
    @Override
    public String login(String phone, String password) {
        // 第一步：校验参数合法性
        // StringUtils.hasText() 检查字符串是否不为 null 、不为空且不全是空白字符
        if (!StringUtils.hasText(phone) || !StringUtils.hasText(password)) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        
        // 第二步：根据手机号查询用户
        // LambdaQueryWrapper 是 MyBatis Plus 的查询条件构建器
        // eq(User::getPhone, phone) 表示条件：phone 字段等于传入的 phone
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getPhone, phone));
        
        // 第三步：验证用户是否存在
        if (user == null) {
            // 不能返回"用户不存在"，统一返回"账号或密码错误"
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        
        // 第四步：验证密码
        // passwordEncoder.matches(原始密码, 存储的哈希值)
        // BCrypt 会自动提取盐并比对
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        
        // 第五步：生成 JWT Token
        // 将用户ID作为 subject 存入 Token
        // Token 有效期通常设置为 7 天或 30 天
        return jwtUtils.generateToken(user.getId());
    }

    /**
     * 验证码登录
     * 
     * 业务流程：
     * 1. 校验参数是否为空
     * 2. 验证短信验证码是否正确
     * 3. 查询用户是否存在
     *    - 存在：直接登录
     *    - 不存在：自动注册新用户后登录
     * 4. 生成 JWT Token 并返回
     * 
     * 特点：
     * - 支持无密码登录，用户体验更好
     * - 首次使用验证码登录时自动注册
     * - 注册时密码设置为空字符串的哈希
     * 
     * 安全考虑：
     * - 验证码存储在 Redis，有效期 5 分钟
     * - 验证成功后立即删除，防止重复使用
     * - 同一手机号 1 分钟内不能重复发送
     * 
     * @param phone 手机号
     * @param code  短信验证码（6位数字）
     * @return JWT Token 字符串
     * @throws BizException 验证码错误或登录失败时抛出
     */
    @Override
    public String loginByCode(String phone, String code) {
        // 第一步：校验参数合法性
        if (!StringUtils.hasText(phone) || !StringUtils.hasText(code)) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        
        // 第二步：验证短信验证码
        // verifyCodeService.verifyCode() 方法会：
        // 1. 从 Redis 中获取存储的验证码
        // 2. 比对用户输入的验证码
        // 3. 验证成功后删除 Redis 中的验证码
        if (!verifyCodeService.verifyCode(phone, code)) {
            throw new BizException(ErrorCode.BAD_REQUEST.getCode(), "验证码错误或已过期");
        }
        
        // 第三步：查询用户是否存在
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getPhone, phone));
        
        // 第四步：用户不存在则自动注册
        if (user == null) {
            // 创建新用户对象
            user = new User();
            user.setPhone(phone);
            // 验证码登录不需要密码，设置为空字符串的哈希
            // 后续可以通过"设置密码"功能设置密码
            user.setPassword(passwordEncoder.encode(""));
            user.setRole("USER");  // 默认角色为普通用户
            user.setCreateTime(LocalDateTime.now());
            user.setUpdateTime(LocalDateTime.now());
            // 插入数据库，MyBatis Plus 会自动填充生成的 ID
            userMapper.insert(user);
        }
        
        // 第五步：生成 JWT Token
        return jwtUtils.generateToken(user.getId());
    }

    /**
     * 用户注册
     * 
     * 业务流程：
     * 1. 校验参数是否为空
     * 2. 检查手机号是否已注册
     * 3. 创建新用户对象
     * 4. 密码加密存储
     * 5. 插入数据库
     * 6. 返回用户ID
     * 
     * 安全考虑：
     * - 密码必须经过 BCrypt 加密，不能明文存储
     * - 手机号必须唯一，防止重复注册
     * - 默认角色为 USER，不允许注册管理员
     * 
     * 使用场景：
     * - 用户主动注册
     * - 管理后台添加用户
     * 
     * @param phone    手机号
     * @param password 原始密码
     * @return 新用户的ID
     * @throws BizException 手机号已注册时抛出
     */
    @Override
    public Long register(String phone, String password) {
        // 第一步：校验参数合法性
        if (!StringUtils.hasText(phone) || !StringUtils.hasText(password)) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        
        // 第二步：检查手机号是否已注册
        // 这是一个防重复注册的关键检查
        User exists = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getPhone, phone));
        if (exists != null) {
            throw new BizException(ErrorCode.BAD_REQUEST.getCode(), "手机号已注册");
        }
        
        // 第三步：创建新用户对象
        User user = new User();
        user.setPhone(phone);
        
        // 第四步：密码加密
        // 必须使用 passwordEncoder 加密，不能明文存储
        // BCrypt 会自动添加盐并生成随机哈希值
        user.setPassword(passwordEncoder.encode(password));
        
        // 第五步：设置用户基本信息
        user.setRole("USER");  // 默认角色
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        
        // 第六步：插入数据库
        // MyBatis Plus 会自动填充生成的 ID 到 user 对象中
        userMapper.insert(user);
        
        // 返回新用户ID，前端可以用于自动登录
        return user.getId();
    }
}




