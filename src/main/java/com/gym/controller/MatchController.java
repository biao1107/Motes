/**
 * ============================================
 * 健身搭子匹配控制器
 * ============================================
 * 作用：
 * 提供健身伙伴智能匹配功能，根据用户的健身偏好找到最合适的搭子
 * 
 * 匹配维度（权重）：
 * 1. 健身目标 (30%) - 如减脂、增肌、塑形
 * 2. 训练时间 (25%) - 如早上、晚上、周末
 * 3. 训练场景 (20%) - 如健身房、户外、家里
 * 4. 监督需求 (15%) - 如严格监督、温和监督、无需监督
 * 5. 健身水平 (10%) - 如初级、中级、高级
 * 
 * 匹配算法：
 * - 完全匹配得满分，不匹配得0分
 * - 监督需求特殊处理：严格vs中等给0.66分
 * - 最终得分 = 各项得分 × 权重，满分100分
 * 
 * 接口列表：
 * 1. GET /match/top - 获取Top N个最佳匹配用户
 * 
 * 使用示例：
 * GET http://localhost:8080/match/top?limit=8
 * Header: Authorization: Bearer {token}
 * ============================================
 */
package com.gym.controller;

// 统一API响应包装类
import com.gym.common.ApiResponse;
// 匹配结果DTO
import com.gym.dto.MatchResult;
// 用户实体类
import com.gym.entity.User;
// 用户数据访问层
import com.gym.mapper.UserMapper;
// 匹配服务层
import com.gym.service.MatchService;
// Lombok自动生成构造方法
import lombok.RequiredArgsConstructor;
// Spring Security认证对象
import org.springframework.security.core.Authentication;
// GET请求注解
import org.springframework.web.bind.annotation.GetMapping;
// 请求路径注解
import org.springframework.web.bind.annotation.RequestMapping;
// 请求参数注解
import org.springframework.web.bind.annotation.RequestParam;
// REST控制器注解
import org.springframework.web.bind.annotation.RestController;

// 集合类
import java.util.ArrayList;
import java.util.List;

/**
 * @RestController 说明：
 * 声明这是一个RESTful控制器，返回JSON数据
 */
@RestController
/**
 * @RequestMapping("/match") 说明：
 * 该控制器下所有接口的URL前缀都是 /match
 */
@RequestMapping("/match")
/**
 * @RequiredArgsConstructor 说明：
 * Lombok自动生成包含所有final字段的构造方法
 * Spring会自动注入MatchService和UserMapper
 */
@RequiredArgsConstructor
public class MatchController {

    /**
     * matchService: 匹配服务层
     * 负责核心的匹配算法和候选用户筛选
     */
    private final MatchService matchService;
    
    /**
     * userMapper: 用户数据访问层
     * 用于查询用户信息
     */
    private final UserMapper userMapper;

    /**
     * 获取Top N个最佳匹配用户（带详细信息）
     * 
     * @GetMapping("/top") 说明：
     * - 处理GET请求
     * - 完整URL: http://localhost:8080/match/top?limit=8
     * 
     * @param limit 返回的匹配结果数量，默认为3
     *              @RequestParam(defaultValue = "8") 表示如果请求中没有limit参数，默认使用3
     * 
     * @param authentication Spring Security的认证对象
     *                       包含当前登录用户的信息
     *                       通过getPrincipal()可以获取用户ID
     * 
     * @return ApiResponse<List<MatchResult>> 匹配结果列表
     *         每个MatchResult包含：用户ID、昵称、头像、匹配分数、健身目标、训练时间、训练场景
     * 
     * 业务流程：
     * 1. 从认证信息中获取当前用户ID
     * 2. 查询当前用户的详细信息
     * 3. 调用匹配服务获取候选用户ID列表（已排序、已限制数量）
     * 4. 批量查询候选用户的详细信息
     * 5. 计算每个候选用户与当前用户的匹配分数（用于展示）
     * 6. 按分数排序并返回结果
     * 
     * 调用示例：
     * curl -X GET "http://localhost:8080/match/top?limit=8" \
     *      -H "Authorization: Bearer eyJhbG..."
     */
    @GetMapping("/top")
    public ApiResponse<List<MatchResult>> topWithDetails(
            @RequestParam(defaultValue = "8") int limit,  // 请求参数，默认值为8
            Authentication authentication                  // 认证对象，自动注入
    ) {
        // ========== 第1步：获取当前用户ID ==========
        // 从Spring Security的认证对象中获取用户ID
        // 这个ID是在登录时存入JWT Token的
        Long userId = (Long) authentication.getPrincipal();
        
        // ========== 第2步：查询当前用户信息 ==========
        // 为什么需要查询当前用户？
        // 因为需要获取当前用户的健身目标、训练时间等信息
        // 用于和候选用户进行匹配度计算
        User currentUser = userMapper.selectById(userId);
        
        // 如果当前用户不存在（理论上不会发生，因为已登录），返回空列表
        if (currentUser == null) {
            return ApiResponse.ok(new ArrayList<>());
        }
        
        // ========== 第3步：获取候选用户ID列表 ==========
        // 调用MatchService的匹配算法
        // matchTopCandidates会完成：分桶筛选、计算分数、排序、限制数量
        // 返回已按匹配分数排序的前N个用户ID
        List<Long> userIds = matchService.matchTopCandidates(userId, limit);
        
        // ========== 第4步：批量查询候选用户信息 ==========
        // selectBatchIds是MyBatis-Plus提供的方法
        // 可以一次性查询多个ID对应的用户记录，比循环查询效率高
        // 等同于 SQL: SELECT * FROM t_user WHERE id IN (1, 2, 3)
        List<User> users = userMapper.selectBatchIds(userIds);
        
        // ========== 第5步：封装匹配结果 ==========
        List<MatchResult> results = new ArrayList<>();
        
        // 遍历每个候选用户
        for (User user : users) {
            // 安全校验：确保不会把自己匹配给自己
            // 虽然matchService应该已经过滤了，但这里再检查一次
            if (!user.getId().equals(userId)) {
                // 创建匹配结果对象
                MatchResult result = new MatchResult();
                
                // 设置用户基本信息
                result.setUserId(user.getId());           // 用户ID
                result.setNickname(user.getNickname());   // 昵称
                result.setAvatar(user.getAvatar());       // 头像URL
                
                // 计算匹配分数
                // calcMatchScore会根据多个维度计算两个用户的匹配度
                double score = calcMatchScore(currentUser, user);
                result.setScore(score);
                
                // 设置用户的健身偏好信息（用于前端展示）
                result.setGoal(user.getFitnessGoal());      // 健身目标
                result.setPreferTime(user.getTrainTime());  // 训练时间
                result.setScene(user.getTrainScene());      // 训练场景
                
                // 添加到结果列表
                results.add(result);
            }
        }
        
        // ========== 第6步：按分数排序并返回结果 ==========
        // 再次按匹配分数降序排列（高分在前）
        // 注意：虽然Service层已排序，但Controller重新计算了分数，需要再次排序
        results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        
        return ApiResponse.ok(results);
    }
    
    /**
     * 计算两个用户之间的匹配分数
     * 
     * @param user1 当前用户
     * @param user2 候选用户
     * @return 匹配分数 (0-100)，保留两位小数
     * 
     * 匹配算法说明：
     * 根据5个维度计算匹配度，每个维度有不同的权重：
     * 
     * 1. 健身目标 (30分)
     *    - 目标相同得30分，不同得0分
     *    - 例如：都是"减脂"得30分，一个是"减脂"一个是"增肌"得0分
     * 
     * 2. 训练时间 (25分)
     *    - 时间相同得25分，不同得0分
     *    - 例如：都是"晚上"得25分
     * 
     * 3. 训练场景 (20分)
     *    - 场景相同得20分，不同得0分
     *    - 例如：都是"健身房"得20分
     * 
     * 4. 监督需求 (15分)
     *    - 完全相同得15分
     *    - "严格"和"中等"比较特殊，给10分（0.66×15）
     *    - 其他情况给7.5分（0.5×15）
     * 
     * 5. 健身水平 (10分)
     *    - 水平相同得10分，不同得0分
     * 
     * 为什么要这样设计？
     * - 健身目标最重要（权重最高），志同道合才能一起训练
     * - 训练时间次之，时间对不上就无法一起训练
     * - 训练场景影响实际训练方式
     * - 监督需求和健身水平相对次要
     */
    private double calcMatchScore(User user1, User user2) {
        // 初始分数为0
        double score = 0;
        
        // 健身目标匹配 (权重30%)
        // match方法：相同返回1.0，不同返回0.0
        score += match(user1.getFitnessGoal(), user2.getFitnessGoal()) * 30;
        
        // 训练时间匹配 (权重25%)
        score += match(user1.getTrainTime(), user2.getTrainTime()) * 25;
        
        // 训练场景匹配 (权重20%)
        score += match(user1.getTrainScene(), user2.getTrainScene()) * 20;
        
        // 监督需求匹配 (权重15%)
        // 使用特殊的matchSupervise方法，因为严格和中等有一定相似性
        score += matchSupervise(user1.getSuperviseDemand(), user2.getSuperviseDemand()) * 15;
        
        // 健身水平匹配 (权重10%)
        score += match(user1.getFitnessLevel(), user2.getFitnessLevel()) * 10;
        
        // 保留两位小数
        // Math.round(score * 100.0) 四舍五入到整数
        // 再除以100.0 得到保留两位小数的结果
        return Math.round(score * 100.0) / 100.0;
    }
    
    /**
     * 基础匹配方法
     * 
     * @param x 第一个值
     * @param y 第二个值
     * @return 匹配度 (1.0表示完全匹配，0.0表示不匹配)
     * 
     * 逻辑：
     * - 如果任一值为null，返回0（不匹配）
     * - 如果两个值相等，返回1.0（完全匹配）
     * - 否则返回0.0（不匹配）
     */
    private double match(String x, String y) {
        // 防御性编程：如果任一值为null，认为不匹配
        if (x == null || y == null) {
            return 0;
        }
        // 使用equals比较字符串内容
        // 相等返回1.0，不相等返回0.0
        return x.equals(y) ? 1.0 : 0.0;
    }
    
    /**
     * 监督需求特殊匹配方法
     * 
     * @param x 第一个用户的监督需求
     * @param y 第二个用户的监督需求
     * @return 匹配度 (1.0, 0.66, 或 0.5)
     * 
     * 特殊处理原因：
     * "严格监督"和"中等监督"的用户可以互相匹配
     * 因为他们都需要一定程度的监督，只是程度不同
     * 
     * 匹配规则：
     * - 完全相同：1.0（满分）
     * - 严格 vs 中等：0.66（较高分，因为有一定兼容性）
     * - 其他情况：0.5（中等分，表示不太匹配但也不是完全不行）
     */
    private double matchSupervise(String x, String y) {
        // 防御性编程
        if (x == null || y == null) {
            return 0;
        }
        
        // 完全相同，返回满分
        if (x.equals(y)) {
            return 1.0;
        }
        
        // 判断是否是"严格"和"中等"的组合
        // 这种组合给0.66分，表示有一定兼容性
        boolean strictMid = ("严格".equals(x) && "中等".equals(y)) || 
                            ("中等".equals(x) && "严格".equals(y));
        
        // 严格vs中等返回0.66，其他情况返回0.5
        return strictMid ? 0.66 : 0.5;
    }
}









