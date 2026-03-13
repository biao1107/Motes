package com.gym.controller;

import com.gym.common.ApiResponse;
import com.gym.service.StatService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 数据统计控制器
 */
@RestController
@RequestMapping("/stat")
@RequiredArgsConstructor
@Validated
public class StatController {

    private final StatService statService;

    /**
     * 获取个人统计数据
     */
    @GetMapping("/personal")
    public ApiResponse<Map<String, Object>> getPersonalStats(org.springframework.security.core.Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        return ApiResponse.ok(statService.getPersonalStats(userId));
    }

    /**
     * 获取组统计数据
     */
    @GetMapping("/group")
    public ApiResponse<Map<String, Object>> getGroupStats(@RequestParam @NotNull Long groupId) {
        return ApiResponse.ok(statService.getGroupStats(groupId));
    }

    /**
     * 获取首页核心统计数据
     */
    @GetMapping("/home")
    public ApiResponse<Map<String, Object>> getHomeStats(org.springframework.security.core.Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        return ApiResponse.ok(statService.getHomeStats(userId));
    }
    
    /**
     * 获取挑战统计数据（支持按条件筛选）
     */
    @GetMapping("/challenge")
    public ApiResponse<Map<String, Object>> getChallengeStats(
            @RequestParam(required = false) Long challengeId,
            org.springframework.security.core.Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        // 如果提供了challengeId，则获取特定挑战的数据，否则获取用户相关的挑战数据
        if (challengeId != null) {
            return ApiResponse.ok(statService.getChallengeStats(challengeId));
        } else {
            // 这里可以扩展为获取用户参与的所有挑战统计
            // 临时返回一个包含用户相关信息的统计
            Map<String, Object> stats = new java.util.HashMap<>();
            stats.put("userId", userId);
            stats.put("message", "请提供具体的challengeId获取挑战统计数据");
            return ApiResponse.ok(stats);
        }
    }
}






