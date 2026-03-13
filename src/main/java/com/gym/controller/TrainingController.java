/**
 * ============================================
 * 训练功能控制器
 * ============================================
 * 作用：
 * 提供健身搝子组的训练进度管理功能
 * 
 * 什么是训练进度？
 * 用户在搝子组里完成训练任务，记录并展示各成员的完成情况
 * 
 * 核心功能：
 * 1. 开始训练 - 搝子组成员进行训练前点击开始
 * 2. 上报进度 - 训练过程中实时上报完成进度
 * 3. 放弃训练 - 中途放弃训练任务
 * 4. 获取今日记录 - 查询今天的训练完成情况
 * 5. 获取待办数量 - 获取今日未完成的训练任务数
 * 
 * 接口列表：
 * 1. POST /training/start  - 开始训练
 * 2. POST /training/report - 上报训练进度
 * 3. POST /training/abandon - 放弃训练
 * 4. GET  /training/today  - 获取今日训练记录
 * 5. GET  /training/todo/count - 获取今日待办数量
 * ============================================
 */
package com.gym.controller;

// 统一API响应包装类
import com.gym.common.ApiResponse;
// 训练服务层接口
import com.gym.service.TrainingService;
// 数字最小值校验注解
import jakarta.validation.constraints.Min;
// 非空校验注解
import jakarta.validation.constraints.NotNull;
// Lombok自动生成getter/setter
import lombok.Data;
// Lombok自动生成构造方法
import lombok.RequiredArgsConstructor;
// 日期格式化注解
import org.springframework.format.annotation.DateTimeFormat;
// Spring Security认证对象
import org.springframework.security.core.Authentication;
// 参数校验注解
import org.springframework.validation.annotation.Validated;
// Spring Web注解
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 训练进度相关接口
 */
/**
 * @RestController 说明：声明这是一个RESTful控制器，返回JSON数据
 * @RequestMapping("/training") 说明：该控制器所有接口的URL前缀为 /training
 * @Validated 说明：开启参数校验
 * @RequiredArgsConstructor 说明：Lombok自动为final字段生成构造方法，Spring自动注入TrainingService
 */
@RestController
@RequestMapping("/training")
@Validated
@RequiredArgsConstructor
public class TrainingController {

    /**
     * trainingService: 训练服务层
     * 负责训练业务逻辑处理
     */
    private final TrainingService trainingService;

    /**
     * 上报训练进度
     *
     * @PostMapping("/report") 说明：处理POST请求，完整URL: /training/report
     *
     * @param req 上报请求参数（组ID、日期、已完成数、目标数、挥战ID）
     * @param authentication Spring Security认证对象，用于获取当前用户ID
     * @return ApiResponse<Void> 空响应，表示成功
     *
     * 业务流程：
     * 1. 更新 Redis 中该组该日训练进度（仅保留更大进度）
     * 2. 同步落库到数据库 t_train_record 表
     * 3. 通过WebSocket推送进度更新通知给组内其他成员
     * 4. 如果关联了组内挥战，自动执行打卡
     * 5. 清除用户统计数据缓存
     *
     * 调用示例：
     * POST /training/report
     * Body: { "groupId": 1, "date": "2024-01-15", "done": 3, "target": 5, "challengeId": 2 }
     */
    @PostMapping("/report")
    public ApiResponse<Void> report(@RequestBody @Validated ReportReq req, org.springframework.security.core.Authentication authentication) {
        // 从认证信息中获取当前用户ID
        Long userId = (Long) authentication.getPrincipal();
        // 调用服务层上报训练进度
        trainingService.reportProgress(userId, req.getGroupId(), req.getDate(), req.getDone(), req.getTarget(), req.getChallengeId());
        return ApiResponse.ok();
    }

    @PostMapping("/start")
    public ApiResponse<Void> startTraining(@RequestBody @Validated StartReq req, org.springframework.security.core.Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        trainingService.startTraining(userId, req.getGroupId());
        return ApiResponse.ok();
    }

    @PostMapping("/abandon")
    public ApiResponse<Void> abandonTraining(@RequestBody @Validated AbandonReq req, Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        trainingService.abandonTraining(userId, req.getGroupId(), req.getDate());
        return ApiResponse.ok();
    }
    
    /**
     * 获取用户的今日训练记录
     *
     * @GetMapping("/today") 说明：处理GET请求，完整URL: /training/today
     *
     * @param authentication Spring Security认证对象
     * @return ApiResponse<List<TrainRecord>> 今日训练记录列表
     *
     * 数据来源：直接查询数据库 t_train_record 表，按创建时间倒序返回
     */
    @GetMapping("/today")
    public ApiResponse<List<com.gym.entity.TrainRecord>> getTodayTraining(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(trainingService.getTodayTraining(userId));
    }

    /**
     * 获取用户今日待完成的训练任务数量
     *
     * @GetMapping("/todo/count") 说明：处理GET请求，完整URL: /training/todo/count
     *
     * @param authentication Spring Security认证对象
     * @return ApiResponse<Integer> 待办数量
     *
     * 业务逻辑：
     * 统计用户参与的所有挥战中，今天还未打卡的挥战数量
     * 用于首页显示待办指标
     */
    @GetMapping("/todo/count")
    public ApiResponse<Integer> getTodoCount(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        int count = trainingService.getTodoCount(userId);
        return ApiResponse.ok(count);
    }

    /**
     * 上报训练进度的请求参数
     *
     * @Data 说明：Lombok自动生成getter、setter、toString等方法
     */
    @Data
    public static class ReportReq {
        /**
         * 搝子组ID
         * @NotNull 表示不能为null
         */
        @NotNull
        private Long groupId;
    
        /**
         * 训练日期
         * @DateTimeFormat 说明：接收ISO格式日期字符串，例如 "2024-01-15"
         */
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate date;
    
        /**
         * 已完成数量
         * @Min(0) 表示最小为0，不能负数
         */
        @Min(0)
        private int done;
    
        /**
         * 目标数量
         * @Min(1) 表示最小为1，目标至少为1
         */
        @Min(1)
        private int target;
    
        /**
         * 关联的组内挥战ID（可选）
         * 传了此字段则训练完成后自动为该挥战打卡
         */
        private Long challengeId;
    }

    /**
     * 开始训练的请求参数
     */
    @Data
    public static class StartReq {
        /**
         * 搝子组ID
         */
        @NotNull
        private Long groupId;
    }

    /**
     * 放弃训练的请求参数
     */
    @Data
    public static class AbandonReq {
        /**
         * 搝子组ID
         */
        @NotNull
        private Long groupId;

        /**
         * 要放弃的训练日期
         */
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate date;
    }
}



