/**
 * ============================================
 * 用户档案接口控制器
 * ============================================
 * 作用：
 * 提供用户个人信息的查询和更新功能
 * 
 * 接口列表：
 * 1. GET /user/profile    - 获取当前登录用户的档案
 * 2. PUT /user/profile    - 更新当前登录用户的档案
 * 3. GET /user/info       - 获取当前登录用户的信息（与profile相同）
 * 
 * 访问权限：
 * - 所有接口都需要登录（JWT Token认证）
 * - 用户只能操作自己的档案信息
 * 
 * 使用示例：
 * 1. 获取档案：GET http://localhost:8080/user/profile
 *    Header: Authorization: Bearer {token}
 * 
 * 2. 更新档案：PUT http://localhost:8080/user/profile
 *    Header: Authorization: Bearer {token}
 *    Body: {
 *        "fitnessGoal": "减脂",
 *        "trainTime": "晚上",
 *        "trainScene": "健身房",
 *        "superviseDemand": "严格监督",
 *        "fitnessLevel": "中级",
 *        "nickname": "健身达人",
 *        "avatar": "http://xxx.com/avatar.jpg"
 *    }
 * ============================================
 */
package com.gym.controller;

// ApiResponse: 统一的API响应包装类，包含code、message、data
import com.gym.common.ApiResponse;
// User: 用户实体类，对应数据库t_user表
import com.gym.entity.User;
// UserService: 用户服务层，处理业务逻辑
import com.gym.service.UserService;
// @Valid: 开启参数校验
import jakarta.validation.Valid;
// @NotNull: 校验字段不能为null
import jakarta.validation.constraints.NotNull;
// @Data: Lombok注解，自动生成getter、setter、toString等方法
import lombok.Data;
// @RequiredArgsConstructor: Lombok注解，为final字段生成构造方法
import lombok.RequiredArgsConstructor;
// Authentication: Spring Security的认证对象，包含当前登录用户信息
import org.springframework.security.core.Authentication;
// @GetMapping: 处理HTTP GET请求
import org.springframework.web.bind.annotation.GetMapping;
// @PutMapping: 处理HTTP PUT请求（用于更新资源）
import org.springframework.web.bind.annotation.PutMapping;
// @RequestBody: 将请求体JSON转换为Java对象
import org.springframework.web.bind.annotation.RequestBody;
// @RequestMapping: 定义该控制器的根路径
import org.springframework.web.bind.annotation.RequestMapping;
// @RestController: 声明这是一个RESTful控制器，返回JSON数据
import org.springframework.web.bind.annotation.RestController;

/**
 * @RestController 说明：
 * 这是一个组合注解，相当于 @Controller + @ResponseBody
 * 表示该类中所有方法都返回JSON数据，而不是页面
 */
@RestController
/**
 * @RequestMapping("/user") 说明：
 * 定义该控制器下所有接口的URL前缀都是 /user
 * 例如：/user/profile, /user/info
 */
@RequestMapping("/user")
/**
 * @RequiredArgsConstructor 说明：
 * Lombok自动生成包含所有final字段的构造方法
 * 这里会自动注入 UserService，不需要写 @Autowired
 */
@RequiredArgsConstructor
public class UserController {

    /**
     * userService: 用户服务层对象
     * final 表示这个字段必须在构造时初始化
     * Spring会自动将UserService的实例注入进来（依赖注入）
     */
    private final UserService userService;

    /**
     * 获取当前登录用户的档案信息
     * 
     * @GetMapping("/profile") 说明：
     * - 处理 GET 请求
     * - 完整URL: http://localhost:8080/user/profile
     * 
     * @param auth Spring Security的认证对象
     *             包含当前登录用户的身份信息
     *             通过 auth.getPrincipal() 可以获取用户ID
     * 
     * @return ApiResponse<User> 统一响应格式
     *         成功时返回用户对象，失败时返回错误信息
     * 
     * 调用示例：
     * curl -X GET http://localhost:8080/user/profile \
     *      -H "Authorization: Bearer eyJhbG..."
     */
    @GetMapping("/profile")
    public ApiResponse<User> profile(Authentication auth) {
        // 1. 从认证对象中获取用户ID
        // auth.getPrincipal() 返回的是登录时设置的userId（Long类型）
        Long uid = (Long) auth.getPrincipal();
        
        // 2. 调用service层查询用户信息
        // userService.getProfile(uid) 会根据ID查询数据库
        User user = userService.getProfile(uid);
        
        // 3. 使用ApiResponse包装返回结果
        // ApiResponse.ok() 表示成功，code=200
        return ApiResponse.ok(user);
    }

    /**
     * 更新当前登录用户的档案信息
     * 
     * @PutMapping("/profile") 说明：
     * - 处理 PUT 请求（用于更新资源）
     * - 完整URL: http://localhost:8080/user/profile
     * 
     * @param req 更新请求对象
     *            @RequestBody 表示从请求体中获取JSON数据
     *            @Valid 表示要校验req中的字段（如@NotNull）
     * 
     * @param auth 认证对象，用于获取当前用户ID
     * 
     * @return ApiResponse<Void> 更新操作不需要返回数据
     * 
     * 调用示例：
     * curl -X PUT http://localhost:8080/user/profile \
     *      -H "Authorization: Bearer eyJhbG..." \
     *      -H "Content-Type: application/json" \
     *      -d '{
     *          "fitnessGoal": "增肌",
     *          "trainTime": "早上",
     *          "trainScene": "户外",
     *          "superviseDemand": "温和监督",
     *          "fitnessLevel": "初级",
     *          "nickname": "新手小白"
     *      }'
     */
    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(
            @RequestBody @Valid UpdateReq req,  // 请求体参数，需要校验
            Authentication auth                 // 认证信息参数
    ) {
        // 1. 获取当前登录用户的ID
        Long uid = (Long) auth.getPrincipal();
        
        // 2. 先查询用户是否存在
        // 安全做法：先查再改，防止操作不存在的用户
        User u = userService.getProfile(uid);
        if (u == null) {
            // 用户不存在，返回400错误
            // ApiResponse.fail(code, message) 表示失败
            return ApiResponse.fail(400, "用户不存在");
        }
        
        // 3. 将请求中的数据设置到用户对象
        // 这里只更新允许修改的字段
        u.setFitnessGoal(req.getFitnessGoal());      // 健身目标
        u.setTrainTime(req.getTrainTime());          // 训练时间
        u.setTrainScene(req.getTrainScene());        // 训练场景
        u.setSuperviseDemand(req.getSuperviseDemand()); // 监督需求
        u.setFitnessLevel(req.getFitnessLevel());    // 健身水平
        u.setNickname(req.getNickname());            // 昵称
        
        // 头像可以为空，所以先判断再设置
        if (req.getAvatar() != null) {
            u.setAvatar(req.getAvatar());            // 头像URL
        }
        
        // 4. 调用service层保存更新
        userService.updateProfile(u);
        
        // 5. 返回成功响应
        // ApiResponse.ok() 表示操作成功，code=200，message="success"
        return ApiResponse.ok();
    }

    /**
     * 获取当前用户详细信息
     * 
     * 说明：
     * 这个接口和 /profile 功能完全一样
     * 之所以有两个接口，是为了让前端代码更清晰：
     * - /profile 用于档案页面
     * - /info 用于其他页面获取用户信息
     * 
     * @param auth 认证对象
     * @return 用户信息
     */
    @GetMapping("/info")
    public ApiResponse<User> getCurrentUserInfo(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ApiResponse.ok(userService.getProfile(userId));
    }

    /**
     * 用户档案更新请求DTO（Data Transfer Object）
     * 
     * 说明：
     * - DTO用于接收前端传来的数据
     * - 为什么不直接用User类？因为User类包含所有字段（如id、password），
     *   而更新时只需要部分字段，且有些字段不能由前端修改（如id）
     * - static 表示这是一个静态内部类，不需要外部类的实例就能创建
     * 
     * @Data 说明：
     * Lombok注解，会自动生成：
     * - 所有字段的getter方法
     * - 所有非final字段的setter方法
     * - toString() 方法
     * - equals() 和 hashCode() 方法
     */
    @Data
    public static class UpdateReq {
        
        /**
         * 健身目标
         * @NotNull 表示这个字段必填，如果为null会返回400错误
         * 可选值：减脂、增肌、塑形、保持健康
         */
        @NotNull
        private String fitnessGoal;
        
        /**
         * 训练时间
         * @NotNull 必填
         * 可选值：早上、中午、晚上、周末
         */
        @NotNull
        private String trainTime;
        
        /**
         * 训练场景
         * @NotNull 必填
         * 可选值：健身房、户外、家里、公司
         */
        @NotNull
        private String trainScene;
        
        /**
         * 监督需求
         * @NotNull 必填
         * 可选值：严格监督、温和监督、无需监督
         */
        @NotNull
        private String superviseDemand;
        
        /**
         * 健身水平
         * @NotNull 必填
         * 可选值：初级、中级、高级
         */
        @NotNull
        private String fitnessLevel;
        
        /**
         * 昵称
         * 没有@NotNull，表示可选，可以为null
         */
        private String nickname;
        
        /**
         * 头像URL
         * 可选，通常由上传接口返回
         */
        private String avatar;
    }
}








