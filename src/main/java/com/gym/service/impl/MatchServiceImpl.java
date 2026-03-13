/**
 * ============================================
 * 智能匹配服务实现类
 * ============================================
 * 作用：
 * 实现健身搭子的智能匹配算法，根据用户档案找到最合适的训练伙伴
 * 
 * 核心算法：分桶策略 + 权重打分
 * 
 * 1. 分桶策略（Bucket Strategy）
 *    目的：减少需要比较的用户数量，提高性能
 *    原理：将用户按"健身目标_训练时间_训练场景"分组
 *    示例：
 *    - 桶1：match:bucket:减脂_晚上_健身房 → {用户1, 用户2, 用户3}
 *    - 桶2：match:bucket:增肌_早上_户外 → {用户4, 用户5}
 *    匹配时只和同桶内的用户比较，避免全量扫描
 * 
 * 2. 权重打分（Weighted Scoring）
 *    在分桶后的候选用户中，按5个维度计算匹配分数
 *    健身目标(30%) + 训练时间(25%) + 训练场景(20%) + 监督需求(15%) + 健身水平(10%)
 * 
 * 3. 缓存策略（Caching）
 *    - match:bucket:{条件} - 分桶缓存（Set结构，存储用户ID集合）
 *    - match:result:{userId} - 匹配结果缓存（List结构，1小时过期）
 *    缓存目的：避免重复计算，提高响应速度
 * 
 * 匹配流程：
 * 1. 获取当前用户信息
 * 2. 将当前用户加入对应分桶
 * 3. 检查是否有缓存的匹配结果
 * 4. 获取同桶内的候选用户
 * 5. 如果同桶用户不足，扩大到全量扫描
 * 6. 计算每个候选用户的匹配分数
 * 7. 按分数排序，返回Top N
 * 8. 缓存匹配结果
 * ============================================
 */
package com.gym.service.impl;

// MyBatis-Plus条件构造器
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
// 用户实体类
import com.gym.entity.User;
// 用户数据访问层
import com.gym.mapper.UserMapper;
// 匹配服务接口
import com.gym.service.MatchService;
// 用户服务
import com.gym.service.UserService;
// Lombok自动生成构造方法
import lombok.RequiredArgsConstructor;
// Redis操作模板
import org.springframework.data.redis.core.RedisTemplate;
// Spring的Service注解
import org.springframework.stereotype.Service;
// Spring集合工具类
import org.springframework.util.CollectionUtils;

// Java时间类
import java.time.Duration;
// 集合类
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
// Stream流操作
import java.util.stream.Collectors;

/**
 * @Service 说明：
 * 声明这是一个Spring服务类，会被Spring扫描并管理
 */
@Service
/**
 * @RequiredArgsConstructor 说明：
 * Lombok自动生成包含所有final字段的构造方法
 */
@RequiredArgsConstructor
public class MatchServiceImpl implements MatchService {

    /**
     * 分桶缓存的key前缀
     * 完整key格式：match:bucket:{健身目标}_{训练时间}_{训练场景}
     * 示例：match:bucket:减脂_晚上_健身房
     * 使用Redis的Set结构存储，每个桶是一个用户ID集合
     */
    private static final String BUCKET_PREFIX = "match:bucket:";
    
    /**
     * 匹配结果缓存的key前缀
     * 完整key格式：match:result:{userId}
     * 存储该用户的匹配结果列表（已排序的用户ID列表）
     * 过期时间：1小时
     */
    private static final String RESULT_PREFIX = "match:result:";

    /**
     * Redis操作模板，用于读写缓存
     */
    private final RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 用户数据访问层，用于查询数据库
     */
    private final UserMapper userMapper;
    
    /**
     * 用户服务，用于获取用户信息
     */
    private final UserService userService;

    /**
     * 获取Top N个最佳匹配候选用户
     * 
     * @param userId 当前用户ID
     * @param limit 返回的候选数量
     * @return 候选用户ID列表，按匹配分数降序排列
     * 
     * 实现逻辑详解：
     * 
     * 第1步：获取当前用户信息
     * 从数据库查询当前用户的完整档案
     * 如果用户不存在，返回空列表
     * 
     * 第2步：将当前用户加入分桶
     * 根据用户的"健身目标_训练时间_训练场景"计算分桶key
     * 使用Redis的Set结构，将用户ID加入对应桶
     * 为什么这样做？让其他用户匹配时能找到当前用户
     * 
     * 第3步：检查缓存
     * 查看是否有缓存的匹配结果（1小时内）
     * 如果有，直接返回缓存结果（提高性能）
     * 
     * 第4步：获取候选用户
     * 从同桶中获取其他用户ID（排除自己）
     * 如果同桶用户不足，退化为全量扫描
     * 
     * 第5步：计算匹配分数
     * 对每个候选用户，按5个维度计算匹配分数
     * 分数阈值15分，低于此分数的过滤掉
     * 
     * 第6步：补充候选（如果需要）
     * 如果候选数量不足limit且总用户数<10
     * 扩大到所有用户，使用更低阈值(10分)补充
     * 
     * 第7步：排序并返回
     * 按匹配分数降序排列
     * 取前limit个
     * 
     * 第8步：缓存结果
     * 将结果缓存1小时，避免重复计算
     */
    @Override
    public List<Long> matchTopCandidates(Long userId, int limit) {
        // ========== 第1步：获取当前用户信息 ==========
        User self = userMapper.selectById(userId);
        if (self == null) {
            // 用户不存在，返回空列表
            return List.of();
        }
        
        // ========== 第2步：将当前用户加入分桶 ==========
        // 计算分桶key，格式：match:bucket:{健身目标}_{训练时间}_{训练场景}
        String bucketKey = bucketKey(self);
        
        // 将用户ID加入对应桶（Set结构，自动去重）
        // opsForSet()获取Set操作对象，add(key, member)添加成员
        redisTemplate.opsForSet().add(bucketKey, userId);
        
        // ========== 第3步：检查缓存结果 ==========
        // 构建结果缓存key
        String resultKey = RESULT_PREFIX + userId;
        
        // 从Redis获取缓存
        Object cached = redisTemplate.opsForValue().get(resultKey);
        
        // 检查缓存是否存在且不为空
        if (cached instanceof List<?>) {
            List<?> cachedList = (List<?>) cached;
            if (!cachedList.isEmpty()) {
                // 将缓存的Object列表转换为Long列表
                List<Long> ids = cachedList.stream()
                        .map(obj -> Long.valueOf(obj.toString()))
                        .collect(Collectors.toList());
                // 返回前limit个
                return ids.stream().limit(limit).collect(Collectors.toList());
            }
        }

        // ========== 第4步：获取候选用户 ==========
        // 使用Set去重存储候选用户ID
        Set<Object> candidateIds = new HashSet<>();
        
        // 从Redis获取同桶内的所有用户ID
        // members(key)获取Set中的所有成员
        Set<Object> sameBucket = redisTemplate.opsForSet().members(bucketKey);
        
        // 如果同桶不为空，加入候选集
        if (!CollectionUtils.isEmpty(sameBucket)) {
            candidateIds.addAll(sameBucket);
        }
        
        // 排除自己（自己不能匹配自己）
        candidateIds.remove(userId);

        // 根据候选ID获取用户详细信息
        List<User> candidates;
        
        // 如果同桶没有候选用户，退化为全量扫描
        if (candidateIds.isEmpty()) {
            // selectList查询所有用户（排除自己）
            // LambdaQueryWrapper用于构建查询条件
            // ne(User::getId, userId)表示id不等于userId
            candidates = userMapper.selectList(new LambdaQueryWrapper<User>()
                    .ne(User::getId, userId));
        } else {
            // 将Object类型的ID转换为Long类型
            List<Long> idList = candidateIds.stream()
                    .map(o -> Long.valueOf(o.toString()))
                    .toList();
            // 批量查询候选用户信息
            candidates = userMapper.selectBatchIds(idList);
        }

        // ========== 第5步：计算匹配分数 ==========
        // 使用Map存储每个候选用户的分数
        Map<Long, Double> scored = new HashMap<>();
        
        // 遍历每个候选用户
        for (User c : candidates) {
            // 计算匹配分数
            double score = calcScore(self, c);
            
            // 分数阈值15分，过滤掉低分用户
            // 为什么设置阈值？避免返回完全不匹配的用户
            if (score >= 15) {
                scored.put(c.getId(), score);
            }
        }
        
        // ========== 第6步：补充候选（如果数量不足） ==========
        // 如果高分候选数量不足limit，且总用户数较少(<10)
        // 扩大到所有用户，使用更低阈值补充
        if (scored.size() < limit && candidates.size() < 10) {
            // 查询所有用户（排除自己）
            List<User> allUsers = userMapper.selectList(new LambdaQueryWrapper<User>()
                    .ne(User::getId, userId));
            
            // 遍历所有用户
            for (User c : allUsers) {
                // 避免重复计算已评估的用户
                if (!scored.containsKey(c.getId())) {
                    double score = calcScore(self, c);
                    // 使用更低阈值10分
                    if (score >= 10) {
                        scored.put(c.getId(), score);
                    }
                }
            }
        }

        // ========== 第7步：排序并限制数量 ==========
        // 按匹配分数降序排列，取前limit个
        List<Long> top = scored.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // ========== 第8步：缓存结果 ==========
        // 将结果存入Redis，1小时过期
        redisTemplate.opsForValue().set(resultKey, new ArrayList<>(top), Duration.ofHours(1));
        
        return top;
    }

    /**
     * 安全获取字符串
     * 
     * @param val 输入值
     * @return 如果为null返回空字符串，否则返回原值
     * 
     * 作用：
     * 防止在拼接字符串时出现"null"字样
     */
    private String safe(String val) {
        return val == null ? "" : val;
    }

    /**
     * 生成分桶key
     * 
     * @param u 用户对象
     * @return 分桶key，格式：match:bucket:{健身目标}_{训练时间}_{训练场景}
     * 
     * 作用：
     * 根据用户的3个核心维度确定分桶
     * 分桶策略：健身目标 + 训练时间 + 训练场景
     * 为什么选这3个？这是决定能否一起训练的最关键因素
     */
    private String bucketKey(User u) {
        return BUCKET_PREFIX + 
               safe(u.getFitnessGoal()) + "_" +  // 健身目标
               safe(u.getTrainTime()) + "_" +    // 训练时间
               safe(u.getTrainScene());          // 训练场景
    }

    /**
     * 计算两个用户的匹配分数
     * 
     * @param a 用户A
     * @param b 用户B
     * @return 匹配分数 (0-100)
     * 
     * 注意：此方法用于计算匹配分数，Service层会排序并限制数量
     */
    private double calcScore(User a, User b) {
        double score = 0;
        score += match(a.getFitnessGoal(), b.getFitnessGoal()) * 30;
        score += match(a.getTrainTime(), b.getTrainTime()) * 25;
        score += match(a.getTrainScene(), b.getTrainScene()) * 20;
        score += matchSupervise(a.getSuperviseDemand(), b.getSuperviseDemand()) * 15;
        score += match(a.getFitnessLevel(), b.getFitnessLevel()) * 10;
        return score;
    }

    private double match(String x, String y) {
        if (x == null || y == null) {
            return 0;
        }
        return x.equals(y) ? 1.0 : 0.0;
    }

    private double matchSupervise(String x, String y) {
        if (x == null || y == null) {
            return 0;
        }
        if (x.equals(y)) {
            return 1.0;
        }
        boolean strictMid = ("严格".equals(x) && "中等".equals(y)) || 
                            ("中等".equals(x) && "严格".equals(y));
        return strictMid ? 0.66 : 0.5;
    }
}




