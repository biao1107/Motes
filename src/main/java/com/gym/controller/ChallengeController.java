package com.gym.controller;

import com.gym.common.ApiResponse;
import com.gym.entity.Challenge;
import com.gym.service.ChallengeService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 挑战控制器
 */
@RestController
@RequestMapping("/challenge")
@RequiredArgsConstructor
@Validated
public class ChallengeController {

    private static final String CHALLENGE_COVER_IMAGE_DEFAULT = "default_challenge_cover.jpg";
    
    private final ChallengeService challengeService;

    /**
     * 创建挑战（公开挑战或组内挑战）
     */
    @PostMapping("/create")
    public ApiResponse<Long> createChallenge(@RequestBody @Validated CreateChallengeReq req, Authentication authentication) {
        Long creatorId = (Long) authentication.getPrincipal();
        Long challengeId = challengeService.createChallenge(creatorId, req.getName(),
                req.getStartDate(), req.getEndDate(), req.getTrainRequire(), req.getMaxMembers(), 
                req.getCoverImage(), req.getGroupId());
        return ApiResponse.ok(challengeId);
    }

    /**
     * 参与挑战
     */
    @PostMapping("/join")
    public ApiResponse<Void> joinChallenge(@RequestBody @Validated JoinChallengeReq req, Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        challengeService.joinChallenge(userId, req.getChallengeId(), req.getGroupId());
        return ApiResponse.ok();
    }

    /**
     * 打卡
     */
    @PostMapping("/punch")
    public ApiResponse<Void> punch(@RequestBody @Validated PunchReq req, Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        challengeService.punch(userId, req.getChallengeId(), req.getDate(), req.getActionFile());
        return ApiResponse.ok();
    }

    /**
     * 获取挑战列表
     */
    @GetMapping("/list")
    public ApiResponse<List<Challenge>> listChallenges(@RequestParam(required = false) Integer status) {
        return ApiResponse.ok(challengeService.listChallenges(status));
    }

    /**
     * 获取挑战详情
     */
    @GetMapping("/{challengeId}")
    public ApiResponse<Challenge> getChallengeDetail(@PathVariable @NotNull Long challengeId) {
        return ApiResponse.ok(challengeService.getChallengeDetail(challengeId));
    }

    /**
     * 生成挑战报告
     * @return 挑战报告DTO，包含结构化数据
     */
    @GetMapping("/{challengeId}/report")
    public ApiResponse<com.gym.dto.ChallengeReportDto> generateReport(@PathVariable @NotNull Long challengeId) {
        return ApiResponse.ok(challengeService.generateReport(challengeId));
    }
    
    /**
     * 手动触发挑战状态更新
     */
    @PostMapping("/update-status")
    public ApiResponse<Void> triggerStatusUpdate() {
        challengeService.updateChallengeStatus();
        return ApiResponse.ok();
    }

    
    
    /**
     * 获取组内挑战列表
     */
    @GetMapping("/group/{groupId}")
    public ApiResponse<List<Challenge>> getGroupChallenges(@PathVariable @NotNull Long groupId) {
        return ApiResponse.ok(challengeService.getGroupChallenges(groupId));
    }
    
    /**
     * 检查用户是否参与了指定挑战
     */
    @GetMapping("/{challengeId}/participation")
    public ApiResponse<Boolean> checkParticipation(@PathVariable @NotNull Long challengeId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean participated = challengeService.checkUserChallengeParticipation(userId, challengeId);
        return ApiResponse.ok(participated);
    }

    @Data
    public static class CreateChallengeReq {
        @NotBlank
        private String name;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate startDate;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate endDate;
        @NotBlank
        private String trainRequire;
        @NotNull
        private Integer maxMembers;
        private String coverImage;  // 新增：挑战封面图片
        private Long groupId;  //可选：组ID，用于创建组内挑战
    }

    @Data
    public static class JoinChallengeReq {
        @NotNull
        private Long challengeId;
        private Long groupId;
    }

    @Data
    public static class PunchReq {
        @NotNull
        private Long challengeId;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate date;
        private String actionFile;
    }
    
}






