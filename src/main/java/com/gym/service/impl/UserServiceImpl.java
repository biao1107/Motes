/**
 * ============================================
 * 用户档案服务实现类
 * ============================================
 * 作用：
 * 处理用户档案相关的业务逻辑，包括查询、更新用户档案
 * 同时负责维护匹配系统的缓存一致性
 * 
 * 什么是Service层？
 * Service层是业务逻辑层，位于Controller和Mapper之间：
 * Controller -> Service -> Mapper -> Database
 * 它负责处理复杂的业务逻辑，不只是简单的CRUD
 * 
 * 缓存策略说明：
 * 系统使用Redis缓存用户的匹配信息，包括：
 * 1. 用户特征缓存 (match:feat:{userId}) - 存储用户的匹配特征
 * 2. 匹配结果缓存 (match:result:{userId}) - 存储匹配计算结果
 * 3. 分桶缓存 (match:bucket:{条件组合}) - 按条件分组存储用户ID集合
 * 
 * 当用户更新档案时，需要清理相关缓存，确保匹配结果是最新的
 * ============================================
 */
package com.gym.service.impl;

// User实体类
import com.gym.entity.User;
// UserMapper数据访问层
import com.gym.mapper.UserMapper;
// UserService接口
import com.gym.service.UserService;
// Lombok自动生成构造方法
import lombok.RequiredArgsConstructor;
// Redis操作模板
import org.springframework.data.redis.core.RedisTemplate;
// Spring的Service注解
import org.springframework.stereotype.Service;

// Java8日期时间类
import java.time.LocalDateTime;

/**
 * @Service 说明：
 * 声明这是一个Spring的服务类（Service层）
 * Spring会自动扫描并管理这个类的实例（Bean）
 * 其他类可以通过 @Autowired 或构造方法注入使用它
 */
@Service
/**
 * @RequiredArgsConstructor 说明：
 * Lombok注解，自动生成包含所有final字段的构造方法
 * 这里会生成：public UserServiceImpl(UserMapper userMapper, RedisTemplate redisTemplate)
 * Spring会自动注入这两个依赖
 */
@RequiredArgsConstructor
/**
 * implements UserService 说明：
 * 实现UserService接口，这是面向接口编程的规范做法
 * Controller依赖的是UserService接口，而不是具体的实现类
 * 这样可以方便地切换不同的实现（如UserServiceImplV2）
 */
public class UserServiceImpl implements UserService {

    /**
     * userMapper: 用户数据访问对象
     * final表示不可变，必须在构造时初始化
     * 用于执行数据库操作（CRUD）
     */
    private final UserMapper userMapper;
    
    /**
     * redisTemplate: Redis操作模板
     * 用于操作Redis缓存，支持各种数据结构（String、Hash、Set等）
     * <String, Object> 表示key是String类型，value是Object类型
     */
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 根据用户ID查询用户档案
     * 
     * @param userId 用户ID
     * @return User对象，如果用户不存在返回null
     * 
     * 实现说明：
     * 直接调用MyBatis-Plus的selectById方法查询数据库
     */
    @Override
    public User getProfile(Long userId) {
        // 使用MyBatis-Plus提供的selectById方法
        // 等同于 SQL: SELECT * FROM t_user WHERE id = #{userId}
        return userMapper.selectById(userId);
    }

    /**
     * 更新用户档案
     * 
     * @param profile 包含更新信息的User对象
     *                必须包含id字段，用于定位要更新的用户
     * 
     * 业务逻辑说明：
     * 1. 先查询旧的用户信息，用于确定原来的分桶
     * 2. 更新数据库中的用户档案
     * 3. 清理和更新Redis中的匹配缓存
     * 
     * 为什么需要处理缓存？
     * 用户的匹配是基于健身目标、训练时间、训练场景等条件
     * 当用户修改这些信息时，原来的匹配结果就失效了
     * 需要清理缓存，让系统在下次匹配时重新计算
     */
    @Override
    public void updateProfile(User profile) {
        // ========== 第1步：获取旧的用户信息 ==========
        // 为什么要查旧信息？
        // 因为需要知道用户原来的分桶（健身目标+训练时间+训练场景的组合）
        // 如果分桶变了，需要从旧分桶移除，添加到新分桶
        User oldUser = userMapper.selectById(profile.getId());
        
        // 旧分桶的key，初始为null
        String oldBucketKey = null;
        
        if (oldUser != null) {
            // 构建旧的分桶key
            // 格式：match:bucket:{健身目标}_{训练时间}_{训练场景}
            // 例如：match:bucket:减脂_晚上_健身房
            oldBucketKey = "match:bucket:" + safe(oldUser.getFitnessGoal()) + "_" + 
                          safe(oldUser.getTrainTime()) + "_" + safe(oldUser.getTrainScene());
        }
        
        // ========== 第2步：更新数据库 ==========
        // 设置更新时间为当前时间
        profile.setUpdateTime(LocalDateTime.now());
        
        // 调用MyBatis-Plus的updateById方法更新数据库
        // 等同于 SQL: UPDATE t_user SET ... WHERE id = #{id}
        // 注意：updateById只更新非null的字段
        userMapper.updateById(profile);
        
        // ========== 第3步：处理缓存 ==========
        // 清理和更新Redis中的匹配相关缓存
        clearMatchCache(profile, oldBucketKey);
    }

    /**
     * 清除匹配相关的缓存
     * 
     * @param updatedUser 更新后的用户信息
     * @param oldBucketKey 原来的分桶key（可能为null）
     * 
     * 缓存清理逻辑：
     * 1. 清除用户特征缓存（match:feat:{userId}）
     * 2. 清除匹配结果缓存（match:result:{userId}）
     * 3. 处理分桶缓存的变更
     *    - 如果分桶变了：从旧分桶移除，添加到新分桶
     *    - 如果分桶没变：重新添加到分桶（更新信息）
     *    - 如果旧分桶为null：直接添加到新分桶
     */
    private void clearMatchCache(User updatedUser, String oldBucketKey) {
        // 获取用户ID
        Long userId = updatedUser.getId();
        
        try {
            // ---------- 清除用户特征缓存 ----------
            // key格式：match:feat:{userId}
            // 这个缓存存储了用户的匹配特征向量
            String featureKey = "match:feat:" + userId;
            redisTemplate.delete(featureKey);
            
            // ---------- 清除匹配结果缓存 ----------
            // key格式：match:result:{userId}
            // 这个缓存存储了系统为用户计算出的匹配结果列表
            String resultKey = "match:result:" + userId;
            redisTemplate.delete(resultKey);
            
            // ---------- 处理分桶缓存 ----------
            // 构建新的分桶key
            String newBucketKey = "match:bucket:" + safe(updatedUser.getFitnessGoal()) + "_" + 
                                  safe(updatedUser.getTrainTime()) + "_" + safe(updatedUser.getTrainScene());
            
            // 情况1：分桶发生了变化（如从"减脂_晚上_健身房"变成"增肌_早上_健身房"）
            if (oldBucketKey != null && !oldBucketKey.equals(newBucketKey)) {
                // 从旧分桶中移除用户ID
                // opsForSet() 获取Set操作对象
                // remove(key, member) 从Set中移除成员
                redisTemplate.opsForSet().remove(oldBucketKey, userId);
                
                // 添加到新分桶
                // add(key, member) 向Set中添加成员
                redisTemplate.opsForSet().add(newBucketKey, userId);
            }
            // 情况2：分桶没有变化，但信息可能更新了
            else if (oldBucketKey != null && oldBucketKey.equals(newBucketKey)) {
                // 重新添加到分桶，确保信息是最新的
                // Set会自动去重，所以重复添加不会有问题
                redisTemplate.opsForSet().add(newBucketKey, userId);
            }
            // 情况3：旧分桶为null（可能是新用户或之前没有分桶信息）
            else if (oldBucketKey == null) {
                // 直接添加到新分桶
                redisTemplate.opsForSet().add(newBucketKey, userId);
            }
        } catch (Exception e) {
            // 缓存操作失败不应该影响主业务流程
            // 所以只打印错误日志，不抛出异常
            System.err.println("清除匹配缓存时发生错误: " + e.getMessage());
        }
    }

    /**
     * 安全获取字符串值
     * 
     * @param val 输入字符串
     * @return 如果val为null返回空字符串""，否则返回原值
     * 
     * 为什么要这个方法？
     * 防止在构建分桶key时出现"null"字符串
     * 例如："match:bucket:" + null + "_" + "晚上" 会变成 "match:bucket:null_晚上"
     * 使用safe方法后变成 "match:bucket:_晚上" 更美观
     */
    private String safe(String val) {
        return val == null ? "" : val;
    }

    /**
     * 获取用户昵称
     * 
     * @param userId 用户ID
     * @return 用户昵称，如果用户不存在返回"用户{userId}"
     * 
     * 使用场景：
     * 在显示用户信息时，如果找不到用户，给出一个默认显示
     */
    @Override
    public String getUserNickname(Long userId) {
        // 查询用户信息
        User user = userMapper.selectById(userId);
        
        // 三元运算符：如果user不为null返回nickname，否则返回默认字符串
        // 等同于：
        // if (user != null) {
        //     return user.getNickname();
        // } else {
        //     return "用户" + userId;
        // }
        return user != null ? user.getNickname() : "用户" + userId;
    }
}