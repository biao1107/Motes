package com.gym.controller;

import com.gym.common.ApiResponse;
import com.gym.service.AuthService;
import com.gym.service.VerifyCodeService;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ============================================
 * 认证控制器 - 处理用户登录注册相关请求
 * ============================================
 * 作用：
 * 1. 接收前端发送的登录/注册/验证码请求
 * 2. 调用 Service 层处理业务逻辑
 * 3. 返回统一格式的 API 响应
 * 
 * 请求路径：/api/auth/**
 * 
 * 前后端配合流程：
 * 前端(api.js) --HTTP请求--> 后端(AuthController) --调用--> Service --操作--> 数据库
 *                                    |
 *                                    ↓
 *                              返回ApiResponse
 *                                    |
 *                                    ↓
 * 前端接收响应 <--JSON数据---------
 * 
 * 注解说明：
 * @RestController - 声明这是一个 RESTful 风格的控制器
 *                  自动将返回值转换为 JSON 格式
 * 
 * @RequestMapping("/auth") - 设置基础请求路径为 /auth
 *                           所有方法的路径都会自动加上 /auth 前缀
 *                           例如：@PostMapping("/login") 实际路径是 /auth/login
 * 
 * @Validated - 启用参数校验
 *             自动校验请求参数中的 @NotBlank 等注解
 *             校验失败会自动返回 400 错误
 * 
 * @RequiredArgsConstructor - Lombok 注解，自动生成包含 final 字段的构造函数
 *                          用于注入 AuthService 和 VerifyCodeService
 * ============================================
 */
@RestController
@RequestMapping("/auth")
@Validated
@RequiredArgsConstructor
public class AuthController {

    /**
     * 认证服务 - 处理登录注册业务逻辑
     * final 关键字表示必须在构造时注入，不能为 null
     * 通过 @RequiredArgsConstructor 自动注入
     */
    private final AuthService authService;
    
    /**
     * 验证码服务 - 处理短信验证码发送和校验
     */
    private final VerifyCodeService verifyCodeService;

    /**
     * 密码登录接口
     * 
     * 请求方法：POST
     * 请求路径：/api/auth/login
     * 请求参数：{ phone: "13800138000", password: "123456" }
     * 返回数据：{ code: 0, data: "eyJhbGc...", message: "成功" }
     * 
     * 前后端配合：
     * 1. 前端调用 apiLoginByPassword({ phone, password })
     * 2. 发送 POST /auth/login 请求
     * 3. 后端接收请求，校验参数合法性
     * 4. 调用 authService.login() 验证用户身份
     * 5. 生成 JWT Token 并返回
     * 6. 前端保存 Token 到本地存储，用于后续请求认证
     * 
     * @param req 登录请求对象，包含手机号和密码
     * @RequestBody 表示从请求体中获取 JSON 数据
     * @Validated 表示对请求参数进行校验（手机号和密码不能为空）
     * @return 返回包含 JWT Token 的统一响应
     */
    @PostMapping("/login")
    public ApiResponse<String> login(@RequestBody @Validated LoginReq req) {
        // 调用认证服务进行登录验证
        // 如果验证失败会抛出异常，由全局异常处理器处理
        String token = authService.login(req.getPhone(), req.getPassword());
        
        // 返回成功响应，data 字段包含 JWT Token
        // 前端收到后保存这个 Token，后续请求都需要携带
        return ApiResponse.ok(token);
    }

    /**
     * 验证码登录接口
     * 
     * 请求方法：POST
     * 请求路径：/api/auth/login/code
     * 请求参数：{ phone: "13800138000", code: "123456" }
     * 返回数据：{ code: 0, data: "eyJhbGc...", message: "成功" }
     * 
     * 使用场景：
     * - 用户忘记密码时
     * - 不想输入密码时
     * - 首次注册后自动登录
     * 
     * 前后端配合：
     * 1. 先调用 /auth/send-code 发送验证码
     * 2. 用户输入收到的验证码
     * 3. 调用此接口进行登录
     * 
     * @param req 验证码登录请求对象，包含手机号和验证码
     * @return 返回包含 JWT Token 的统一响应
     */
    @PostMapping("/login/code")
    public ApiResponse<String> loginByCode(@RequestBody @Validated LoginByCodeReq req) {
        // 调用认证服务进行验证码登录
        // 服务层会校验验证码是否正确、是否过期
        String token = authService.loginByCode(req.getPhone(), req.getCode());
        return ApiResponse.ok(token);
    }

    /**
     * 用户注册接口
     * 
     * 请求方法：POST
     * 请求路径：/api/auth/register
     * 请求参数：{ phone: "13800138000", password: "123456" }
     * 返回数据：{ code: 0, data: 12345, message: "注册成功" }
     * 
     * 前后端配合：
     * 1. 前端调用 apiRegister({ phone, password })
     * 2. 发送 POST /auth/register 请求
     * 3. 后端校验手机号是否已注册
     * 4. 创建新用户记录，密码加密存储
     * 5. 返回用户ID
     * 6. 前端可选：自动登录（调用登录接口）
     * 
     * @param req 注册请求对象，包含手机号和密码
     * @return 返回包含新用户ID的统一响应
     */
    @PostMapping("/register")
    public ApiResponse<Long> register(@RequestBody @Validated LoginReq req) {
        // 调用认证服务进行注册
        // 如果手机号已存在会抛出异常
        Long id = authService.register(req.getPhone(), req.getPassword());
        return ApiResponse.ok(id);
    }

    /**
     * 发送验证码接口
     * 
     * 请求方法：POST
     * 请求路径：/api/auth/send-code
     * 请求参数：{ phone: "13800138000" }
     * 返回数据：{ code: 0, data: null, message: "验证码已发送" }
     * 
     * 业务逻辑：
     * 1. 生成随机6位数字验证码
     * 2. 将验证码保存到 Redis，设置5分钟过期时间
     * 3. 调用短信服务发送验证码到用户手机
     * 4. 同一手机号1分钟内不能重复发送
     * 
     * 前后端配合：
     * 1. 用户输入手机号
     * 2. 前端调用 apiSendCode({ phone })
     * 3. 后端发送验证码
     * 4. 用户收到短信后输入验证码
     * 5. 调用验证码登录接口
     * 
     * @param req 发送验证码请求对象，包含手机号
     * @return 返回成功响应（无数据）
     */
    @PostMapping("/send-code")
    public ApiResponse<Void> sendCode(@RequestBody @Validated SendCodeReq req) {
        // 调用验证码服务发送短信验证码
        verifyCodeService.sendCode(req.getPhone());
        return ApiResponse.ok();
    }

    /**
     * 登录/注册请求对象
     * 作为内部类定义在 AuthController 内部
     * 使用 @Data 注解自动生成 getter/setter/toString 等方法
     * 
     * 校验规则：
     * @NotBlank - 字段不能为空且不能全是空白字符
     * 如果校验失败，Spring 会自动返回 400 错误
     */
    @Data
    public static class LoginReq {
        @NotBlank(message = "手机号不能为空")
        private String phone;
        
        @NotBlank(message = "密码不能为空")
        private String password;
    }

    /**
     * 验证码登录请求对象
     * 继承了登录请求的基础，添加了验证码字段
     */
    @Data
    public static class LoginByCodeReq {
        @NotBlank(message = "手机号不能为空")
        private String phone;
        
        @NotBlank(message = "验证码不能为空")
        private String code;
    }

    /**
     * 发送验证码请求对象
     * 只需要手机号即可
     */
    @Data
    public static class SendCodeReq {
        @NotBlank(message = "手机号不能为空")
        private String phone;
    }
}




