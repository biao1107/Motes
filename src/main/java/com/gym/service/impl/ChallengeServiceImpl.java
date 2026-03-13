package com.gym.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.gym.common.ErrorCode;
import com.gym.common.exception.BizException;
import com.gym.dto.ChallengeReportDto;
import com.gym.entity.Challenge;
import com.gym.entity.ChallengeParticipant;
import com.gym.entity.GroupMember;
import com.gym.entity.PartnerGroup;
import com.gym.entity.TrainRecord;
import com.gym.mapper.ChallengeMapper;
import com.gym.mapper.ChallengeParticipantMapper;
import com.gym.mapper.PartnerGroupMapper;
import com.gym.mapper.TrainRecordMapper;
import com.gym.service.ChallengeService;
import com.gym.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 挑战服务实现类 - 处理所有与挑战相关的业务逻辑
 * 
 * 【什么是"服务实现类"？】
 * 在Spring框架中，Service层负责处理业务逻辑。这个类实现了 ChallengeService 接口定义的所有功能。
 * 
 * 【这个类做什么？】
 * 想象一个健身挑战App，这个类就是"挑战管家"，负责：
 * - 创建新挑战（比如"30天腹肌训练"）
 * - 让用户加入挑战
 * - 每天记录打卡（用户上传训练照片）
 * - 自动更新挑战状态（未开始→进行中→已结束）
 * - 清理过期的旧挑战
 * - 生成挑战结束后的成绩报告
 * 
 * 【两种挑战类型】
 * 1. 公开挑战：所有人都能看到和参加
 *    - 判断方法：groupId = null 或 0
 * 2. 组内挑战：只有特定小组成员能参加
 *    - 判断方法：groupId > 0（表示某个组的ID）
 * 
 * 【挑战的三种状态】
 * - 0（未开始）：还没到开始日期，不能打卡
 * - 1（进行中）：可以正常打卡的时间段
 * - 2（已结束）：超过结束日期，不能再打卡
 * 
 * 【用到的技术】
 * - @Service：标记这是Spring的服务类
 * - @Transactional：保证数据库操作要么全成功，要么全失败（事务）
 * - Redis：缓存数据，加快查询速度
 * - MyBatis-Plus：简化数据库操作
 * 
 * @author Gym System
 * @see ChallengeService
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChallengeServiceImpl implements ChallengeService {

    // ==================== Redis 缓存键前缀 ====================
    // 【什么是Redis？】
    // Redis是一个内存数据库，比MySQL快很多。我们把经常查询的数据放在Redis里，
    // 用户请求时先查Redis，没有再去查MySQL，这样响应更快。
    
    /**
     * Redis 键前缀：用户打卡记录
     * 【用途】记录用户某天是否已经打卡，防止重复打卡
     * 【格式】punch:用户ID:挑战ID:日期
     * 【示例】punch:100:5:2025-02-27 表示用户100在2月27日给挑战5打过卡
     * 【过期时间】24小时（每天自动过期）
     */
    private static final String PUNCH_PREFIX = "punch:";
    
    /**
     * Redis 键前缀：挑战参与者集合
     * 【用途】快速查询某个挑战有多少人参加
     * 【格式】challenge:participants:挑战ID
     * 【示例】challenge:participants:5 存储了所有参加挑战5的用户ID集合
     * 【数据结构】Redis Set（集合），可以方便地统计人数
     */
    private static final String CHALLENGE_PARTICIPANTS_PREFIX = "challenge:participants:";
    
    /**
     * Redis 键前缀：挑战封面图片URL缓存
     * 【用途】缓存封面图片的访问URL，避免每次都去MinIO生成
     * 【格式】challenge:image:挑战ID
     * 【示例】challenge:image:5 存储了挑战5的封面图片URL
     * 【过期时间】6小时
     */
    private static final String CHALLENGE_IMAGE_CACHE_KEY = "challenge:image:";
    
    /**
     * 缓存有效期：6小时
     * 【为什么6小时？】图片URL一般不会频繁变化，6小时足够用，又不会占用太多内存
     */
    private static final long CACHE_EXPIRE_HOURS = 6;

    // ==================== 依赖注入 ====================
    
    private final ChallengeMapper challengeMapper;
    private final ChallengeParticipantMapper participantMapper;
    private final TrainRecordMapper trainRecordMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final StorageService storageService;
    private final PartnerGroupMapper partnerGroupMapper;

    // ==================== 核心业务流程方法 ====================

    /**
     * 创建挑战（公开挑战或组内挑战）
     * 
     * 【这个方法做什么？】
     * 当用户在App上点击"创建挑战"按钮时，就会调用这个方法。
     * 它负责把用户填写的挑战信息保存到数据库。
     * 
     * 【什么是公开挑战和组内挑战？】
     * - 公开挑战：所有人都能在App里看到，谁都可以参加
     * - 组内挑战：只有某个小组的成员能看到和参加（比如"健身小分队"内部挑战）
     * 
     * 【如何判断类型？】
     * 看 groupId 参数：
     * - groupId = null 或 0 → 公开挑战
     * - groupId > 0 → 组内挑战（这个数字就是小组的ID）
     * 
     * 【创建流程详解】
     * 1. 检查日期是否合理（结束不能比开始早）
     * 2. 如果是组内挑战，检查这个组是否存在
     * 3. 创建挑战对象，设置各种属性
     * 4. 保存到数据库
     * 5. 让创建者自动加入这个挑战（创建者当然要参加自己的挑战）
     * 
     * 【@Transactional 是什么意思？】
     * 这是一个"事务"注解。想象你去银行转账：扣款和收款必须同时成功或同时失败。
     * 如果中间出错了，所有操作都会回滚，不会出现"钱扣了但没到账"的情况。
     * 
     * @param creatorId    创建者的用户ID（谁创建了这个挑战）
     * @param name         挑战名称（如"30天腹肌训练"）
     * @param startDate    开始日期（挑战什么时候开始）
     * @param endDate      结束日期（挑战什么时候结束）
     * @param trainRequire 训练要求（如"每天做50个仰卧起坐"）
     * @param maxMembers   最多允许多少人参加（比如100人）
     * @param coverImage   封面图片（挑战的展示图）
     * @param groupId      组ID，null或0表示公开挑战，其他数字表示组内挑战
     * @return 新创建的挑战ID（创建成功后返回的编号）
     * @throws BizException 如果日期不对或组不存在，会抛出异常
     */
    @Override
    @Transactional  // 事务注解：保证所有数据库操作要么全成功，要么全失败
    public Long createChallenge(Long creatorId, String name, LocalDate startDate, LocalDate endDate,
                               String trainRequire, Integer maxMembers, String coverImage, Long groupId) {
        
        // 第1步：验证日期范围
        // 检查结束日期是否比开始日期早，如果是就报错（比如不能2月1日结束，2月5日才开始）
        validateDateRange(startDate, endDate);

        // 第2步：判断挑战类型
        // groupId != null 表示传了groupId，groupId > 0 表示是一个有效的组ID
        // 如果两个条件都满足，就是组内挑战；否则是公开挑战
        boolean isGroupChallenge = groupId != null && groupId > 0;

        // 第3步：如果是组内挑战，验证组是否存在
        // 不能让用户创建一个不存在的小组的挑战
        if (isGroupChallenge) {
            getGroupOrThrow(groupId);  // 如果组不存在，这个方法会抛出异常
        }

        // 第4步：构建挑战对象
        // buildChallenge 是一个私有方法，负责创建 Challenge 对象并设置各种属性
        // 如果是组内挑战，把groupId传进去；如果是公开挑战，传null
        Challenge challenge = buildChallenge(name, startDate, endDate, trainRequire, maxMembers, coverImage, 
                                            isGroupChallenge ? groupId : null);
        
        // 第5步：保存到数据库
        // challengeMapper 是操作数据库的工具，insert 方法会把 challenge 对象插入到数据库
        challengeMapper.insert(challenge);
        
        // 第6步：创建者自动参与挑战
        // 谁创建的挑战，当然要自动参加，不需要再手动点击"参加"
        // 传入 challenge.getId() 获取刚创建的挑战的ID（数据库自动生成的）
        joinChallenge(creatorId, challenge.getId(), isGroupChallenge ? groupId : null);

        // 第7步：记录日志
        // 在服务器日志里记录这次操作，方便以后排查问题
        if (isGroupChallenge) {
            log.info("创建组内挑战成功: challengeId={}, groupId={}, creator={}", challenge.getId(), groupId, creatorId);
        } else {
            log.info("创建公开挑战成功: challengeId={}, creator={}", challenge.getId(), creatorId);
        }
        
        // 返回新创建的挑战ID，前端可以用这个ID跳转到挑战详情页
        return challenge.getId();
    }

    /**
     * 用户参与挑战
     * 
     * <p>
     * 参与流程：
     * <ol>
     *   <li>验证挑战是否存在</li>
     *   <li>验证用户未重复参与</li>
     *   <li>验证挑战人数未满</li>
     *   <li>创建参与记录</li>
     *   <li>将用户加入Redis参与者集合（用于快速查询人数）</li>
     * </ol>
     * </p>
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @param groupId     组ID，参与组内挑战时传入
     * @throws BizException 挑战不存在、已参与、或人数已满时抛出
     */
    @Override
    @Transactional
    public void joinChallenge(Long userId, Long challengeId, Long groupId) {
        Challenge challenge = getChallengeOrThrow(challengeId);
        validateNotParticipated(userId, challengeId);
        validateMaxMembers(challengeId, challenge.getMaxMembers());

        ChallengeParticipant participant = new ChallengeParticipant();
        participant.setChallengeId(challengeId);
        participant.setUserId(userId);
        participant.setGroupId(groupId != null ? groupId : 0L);
        participant.setPunchDays(0);
        participant.setStatus(0);
        participant.setCreateTime(LocalDateTime.now());
        participantMapper.insert(participant);

        String key = CHALLENGE_PARTICIPANTS_PREFIX + challengeId;
        redisTemplate.opsForSet().add(key, userId);
        log.info("参与挑战成功: userId={}, challengeId={}", userId, challengeId);
    }

    /**
     * 用户打卡
     * 
     * <p>
     * 打卡流程：
     * <ol>
     *   <li>验证打卡资格（未打卡、已参与、挑战进行中）</li>
     *   <li>组内挑战需额外验证当日训练已完成</li>
     *   <li>更新参与者打卡天数</li>
     *   <li>保存打卡图片（如有）</li>
     *   <li>标记当日已打卡（Redis，24小时过期）</li>
     * </ol>
     * </p>
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @param date        打卡日期
     * @param actionFile  打卡图片对象名，可为null
     * @throws BizException 不符合打卡条件时抛出
     */
    @Override
    // 【@Transactional 详解】
    // 这个注解表示"事务"，保证打卡操作的原子性（要么全成功，要么全失败）
    // 
    // 【propagation = Propagation.REQUIRES_NEW 是什么意思？】
    // 
    // 想象事务是一个"工作单元"：
    // - 普通 @Transactional：如果有外层事务，就加入它（一起成功/失败）
    // - REQUIRES_NEW：不管有没有外层事务，都开启一个全新的事务
    // 
    // 【为什么要用 REQUIRES_NEW？】
    // 打卡是一个独立的重要操作，即使外层出错了，打卡记录也应该保存。
    // 比如：用户在完成训练后打卡，即使训练记录更新失败，打卡也应该成功记录。
    // 
    // 【通俗比喻】
    // 就像你去餐厅吃饭：
    // - 普通事务：和朋友AA制，一起结账，有人没带钱大家都走不了
    // - REQUIRES_NEW：各付各的，你付你的，不影响别人
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void punch(Long userId, Long challengeId, LocalDate date, String actionFile) {
        // 【第1步：验证打卡资格】
        // 检查用户今天是否可以打卡，包括：
        // - 今天还没打过卡（不能重复打卡）
        // - 用户已经参加了这个挑战
        // - 挑战正在进行中（未开始或已结束的不能打卡）
        // - 如果是组内挑战，还要检查今天是否已完成训练
        validatePunchEligibility(userId, challengeId, date);
        
        // 【第2步：获取用户参与记录】
        // 从数据库查出用户参加这个挑战的记录
        // 里面保存了用户的打卡天数等信息
        ChallengeParticipant participant = getParticipantOrThrow(userId, challengeId);
        
        // 【第3步：更新打卡信息】
        // - 打卡天数 +1
        // - 如果有上传图片，保存图片路径
        // - 更新到数据库
        updateParticipant(participant, actionFile);

        // 【第4步：标记今日已打卡】
        // 在Redis里记录"今天已打卡"，防止重复打卡
        // 这个记录24小时后自动过期（因为明天还能打）
        markAsPunched(userId, challengeId, date);
        
        // 【第5步：记录日志】
        // 在服务器日志里记录这次打卡，方便排查问题
        log.info("打卡成功: userId={}, challengeId={}, date={}, actionFile={}", userId, challengeId, date, actionFile);
    }

    /**
     * 获取挑战列表
     * 
     * @param status 状态筛选：0-未开始，1-进行中，2-已结束，null-全部
     * @return 挑战列表（包含处理后的封面图片URL）
     */
    @Override
    public List<Challenge> listChallenges(Integer status) {
        // 【第1步：查询挑战列表】
        // 根据状态筛选查询挑战
        // status = null 表示查询所有挑战，不管状态
        // status = 0/1/2 表示只查询对应状态的挑战
        List<Challenge> challenges;
        if (status != null) {
            // 有状态筛选：只查指定状态的挑战
            // LambdaQueryWrapper 是 MyBatis-Plus 提供的查询构造器
            // eq 表示"等于"，即 Challenge::getStatus 等于传入的 status
            challenges = challengeMapper.selectList(
                new LambdaQueryWrapper<Challenge>().eq(Challenge::getStatus, status)
            );
        } else {
            // 没有状态筛选：查询所有挑战
            // 传入 null 表示不加任何条件
            challenges = challengeMapper.selectList(null);
        }
        
        // 【第2步：处理封面图片URL】
        // 数据库里存的可能只是图片的对象名（如 "actions/xxx.jpg"）
        // 需要转换成可访问的完整URL（如 "http://localhost:9000/actions/xxx.jpg"）
        // processChallengeImages 方法会遍历每个挑战，调用 processChallengeImage 处理
        // 同时会利用Redis缓存，避免每次都去MinIO生成URL
        return processChallengeImages(challenges);
    }

    /**
     * 获取挑战详情
     * 
     * @param challengeId 挑战ID
     * @return 挑战详情（包含处理后的封面图片URL）
     * @throws BizException 挑战不存在时抛出
     */
    @Override
    public Challenge getChallengeDetail(Long challengeId) {
        Challenge challenge = challengeMapper.selectById(challengeId);
        if (challenge == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "挑战不存在");
        }
        processChallengeImage(challenge);
        return challenge;
    }

    /**
     * 生成挑战报告
     * 
     * <p>
     * 报告内容包括：
     * <ul>
     *   <li>挑战名称和时间范围</li>
     *   <li>参与人数</li>
     *   <li>每个参与者的打卡天数和完成率</li>
     * </ul>
     * </p>
     * 
     * @param challengeId 挑战ID
     * @return 格式化的报告文本
     * @throws BizException 挑战不存在时抛出
     */
    @Override
    public ChallengeReportDto generateReport(Long challengeId) {
        // 【第1步：获取挑战信息】
        // 根据挑战ID查询挑战详情
        // getChallengeOrThrow 意思是"获取挑战，不存在就抛出异常"
        // 如果挑战不存在，会抛出 BizException，提示"挑战不存在"
        Challenge challenge = getChallengeOrThrow(challengeId);
        
        // 【第2步：获取参与者列表】
        // 查询所有参加这个挑战的用户
        // 包含每个用户的打卡天数、打卡图片等信息
        List<ChallengeParticipant> participants = getChallengeParticipants(challengeId);

        // 【第3步：生成报告】
        // 把挑战信息和参与者信息组合成结构化的DTO
        // DTO包含：挑战名称、时间、参与人数、每个人的打卡天数和完成率
        // 前端可以直接使用这些数据展示排行榜、统计图表等
        ChallengeReportDto report = buildChallengeReport(challenge, participants);
        
        // 打印日志，确认返回的数据
        log.info("生成挑战报告: challengeId={}, challengeName={}, participantCount={}", 
                challengeId, report.getChallengeName(), report.getParticipantCount());
        
        return report;
    }
    
    /**
     * 更新挑战状态（定时任务调用）
     * 
     * <p>
     * 自动状态转换：
     * <ul>
     *   <li>未开始 → 进行中：开始日期到达</li>
     *   <li>进行中 → 已结束：结束日期已过</li>
     * </ul>
     * </p>
     * 
     * <p>
     * 建议由定时任务每天凌晨执行，确保挑战状态与实际日期同步。
     * </p>
     */
    @Override
    public void updateChallengeStatus() {
        // 【第1步：获取今天的日期】
        // LocalDate.now() 返回当前日期，比如 2026-03-10
        // LocalDate 是 Java 8 引入的日期类，专门用于处理"年月日"（不包含时分秒）
        LocalDate now = LocalDate.now();
        
        // 【第2步：更新即将开始的挑战】
        // 把"开始日期 ≤ 今天"的挑战，从"未开始"状态改为"进行中"
        // 比如有个挑战设置 3月10日开始，今天是3月10日，那它就该开始了
        updateUpcomingChallenges(now);
        
        // 【第3步：更新已结束的挑战】
        // 把"结束日期 < 今天"的挑战，从"进行中"状态改为"已结束"
        // 比如有个挑战设置 3月8日结束，今天是3月10日，那它就该结束了
        updateActiveChallenges(now);
    }

    /**
     * 获取组内挑战列表
     * 
     * <p>
     * 仅返回指定组、状态为"进行中"的挑战。
     * </p>
     * 
     * @param groupId 组ID
     * @return 该组的进行中挑战列表
     */
    @Override
    public List<Challenge> getGroupChallenges(Long groupId) {
        List<Challenge> challenges = challengeMapper.selectList(
            new LambdaQueryWrapper<Challenge>()
                .eq(Challenge::getGroupId, groupId)
                .eq(Challenge::getStatus, 1)
        );
        return processChallengeImages(challenges);
    }
    
    /**
     * 获取挑战参与者列表
     * 
     * <p>
     * 返回所有参与者信息，包含打卡图片的URL（如有）。
     * </p>
     * 
     * @param challengeId 挑战ID
     * @return 参与者列表
     */
    @Override
    public List<ChallengeParticipant> getChallengeParticipants(Long challengeId) {
        // 【第1步：查询数据库，获取所有参与者】
        // LambdaQueryWrapper 是 MyBatis-Plus 提供的查询条件构造器
        // 它可以让我们用 Java 代码（而不是 SQL）来构建查询条件
        LambdaQueryWrapper<ChallengeParticipant> wrapper = new LambdaQueryWrapper<>();
        
        // 添加查询条件：challenge_id = 传入的challengeId
        // 相当于 SQL: WHERE challenge_id = ?
        wrapper.eq(ChallengeParticipant::getChallengeId, challengeId);
        
        // 执行查询，返回该挑战的所有参与者列表
        // 每个参与者包含：用户ID、打卡天数、打卡图片等信息
        List<ChallengeParticipant> participants = participantMapper.selectList(wrapper);
        
        // 【第2步：返回参与者列表】
        // 注意：actionFile 字段在打卡时已经存储了完整的 URL，不需要再转换
        // 后端 /storage/upload/action 接口返回的就是完整 URL，前端直接存储到数据库
        return participants;
    }

    // ==================== 私有辅助方法 ====================

    /**
     * 验证日期范围有效性
     * 
     * @param startDate 开始日期
     * @param endDate   结束日期
     * @throws BizException 结束日期早于开始日期时抛出
     */
    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new BizException(ErrorCode.BAD_REQUEST, "结束日期不能早于开始日期");
        }
    }

    /**
     * 构建挑战实体
     * 
     * <p>
     * 根据当前日期自动计算挑战初始状态：
     * <ul>
     *   <li>当前 < 开始日期：未开始（status=0）</li>
     *   <li>开始日期 <= 当前 <= 结束日期：进行中（status=1）</li>
     *   <li>当前 > 结束日期：已结束（status=2）</li>
     * </ul>
     * </p>
     * 
     * @param name         挑战名称
     * @param startDate    开始日期
     * @param endDate      结束日期
     * @param trainRequire 训练要求
     * @param maxMembers   最大人数
     * @param coverImage   封面图片
     * @param groupId      组ID，null表示公开挑战
     * @return 构建好的挑战实体
     */
    private Challenge buildChallenge(String name, LocalDate startDate, LocalDate endDate, 
                                   String trainRequire, Integer maxMembers, String coverImage, Long groupId) {
        Challenge challenge = new Challenge();
        challenge.setChallengeName(name);
        challenge.setStartDate(startDate);
        challenge.setEndDate(endDate);
        challenge.setTrainRequire(trainRequire);
        challenge.setMaxMembers(maxMembers);
        challenge.setCoverImage(coverImage);
        challenge.setGroupId(groupId);
        
        // 根据日期计算初始状态
        LocalDate now = LocalDate.now();
        if (now.isBefore(startDate)) {
            challenge.setStatus(0); // 未开始
        } else if (now.isAfter(endDate)) {
            challenge.setStatus(2); // 已结束
        } else {
            challenge.setStatus(1); // 进行中
        }
        
        // 移除type字段设置，统一使用groupId判断挑战类型：groupId > 0 为组内挑战，否则为公开挑战
        challenge.setCreateTime(LocalDateTime.now());
        return challenge;
    }

    /**
     * 根据ID获取挑战，不存在时抛出异常
     * 
     * @param challengeId 挑战ID
     * @return 挑战实体
     * @throws BizException 挑战不存在时抛出
     */
    private Challenge getChallengeOrThrow(Long challengeId) {
        Challenge challenge = challengeMapper.selectById(challengeId);
        if (challenge == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "挑战不存在");
        }
        return challenge;
    }

    /**
     * 验证用户未参与过该挑战
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @throws BizException 已参与时抛出
     */
    private void validateNotParticipated(Long userId, Long challengeId) {
        ChallengeParticipant exist = participantMapper.selectOne(
                new LambdaQueryWrapper<ChallengeParticipant>()
                        .eq(ChallengeParticipant::getUserId, userId)
                        .eq(ChallengeParticipant::getChallengeId, challengeId));
        if (exist != null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "已参与该挑战");
        }
    }

    /**
     * 验证挑战人数未满
     * 
     * <p>
     * 优先从Redis缓存获取人数，缓存未命中时从数据库加载并初始化缓存。
     * </p>
     * 
     * @param challengeId 挑战ID
     * @param maxMembers  最大人数限制
     * @throws BizException 人数已满时抛出
     */
    private void validateMaxMembers(Long challengeId, Integer maxMembers) {
        String key = CHALLENGE_PARTICIPANTS_PREFIX + challengeId;
        Long count = redisTemplate.opsForSet().size(key);
        if (count == null) {
            // 初始化缓存
            List<ChallengeParticipant> participants = participantMapper.selectList(
                    new LambdaQueryWrapper<ChallengeParticipant>()
                            .eq(ChallengeParticipant::getChallengeId, challengeId));
            participants.forEach(p -> redisTemplate.opsForSet().add(key, p.getUserId()));
            count = (long) participants.size();
        }
        if (count >= maxMembers) {
            throw new BizException(ErrorCode.BAD_REQUEST, "挑战人数已满");
        }
    }

    /**
     * 验证用户打卡资格
     * 
     * <p>
     * 验证条件：
     * <ul>
     *   <li>今日未打卡</li>
     *   <li>用户已参与挑战</li>
     *   <li>挑战存在</li>
     *   <li>组内挑战需完成当日训练</li>
     * </ul>
     * </p>
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @param date        日期
     * @throws BizException 不符合打卡条件时抛出
     */
    private void validatePunchEligibility(Long userId, Long challengeId, LocalDate date) {
        if (hasAlreadyPunched(userId, challengeId, date)) {
            throw new BizException(ErrorCode.BAD_REQUEST, "今日已打卡");
        }

        ChallengeParticipant participant = getParticipantOrThrow(userId, challengeId);
        Challenge challenge = getChallengeOrThrow(challengeId);

        // 对组内挑战（groupId > 0）进行额外检查：需要完成当日训练
        if (challenge.getGroupId() != null && challenge.getGroupId() > 0) {
            TrainRecord record = trainRecordMapper.selectOne(
                    new LambdaQueryWrapper<TrainRecord>()
                            .eq(TrainRecord::getUserId, userId)
                            .eq(TrainRecord::getTrainDate, date)
                            .eq(TrainRecord::getStatus, 1));
            if (record == null) {
                log.warn("用户尝试为组内挑战打卡但未完成当日训练: userId={}, challengeId={}, date={}", 
                         userId, challengeId, date);
                throw new BizException(ErrorCode.BAD_REQUEST, "请先完成今日协同训练后再打卡");
            }
        }
    }

    /**
     * 检查用户今日是否已打卡
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @param date        日期
     * @return true-已打卡，false-未打卡
     */
    private boolean hasAlreadyPunched(Long userId, Long challengeId, LocalDate date) {
        String punchKey = PUNCH_PREFIX + userId + ":" + challengeId + ":" + date;
        return Boolean.TRUE.equals(redisTemplate.hasKey(punchKey));
    }

    /**
     * 获取用户参与记录，不存在时抛出异常
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @return 参与记录
     * @throws BizException 未参与时抛出
     */
    private ChallengeParticipant getParticipantOrThrow(Long userId, Long challengeId) {
        ChallengeParticipant participant = participantMapper.selectOne(
                new LambdaQueryWrapper<ChallengeParticipant>()
                        .eq(ChallengeParticipant::getUserId, userId)
                        .eq(ChallengeParticipant::getChallengeId, challengeId));
        if (participant == null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "未参与该挑战");
        }
        return participant;
    }

    /**
     * 更新参与者打卡信息
     * 
     * @param participant 参与记录
     * @param actionFile  打卡图片对象名，可为null
     */
    private void updateParticipant(ChallengeParticipant participant, String actionFile) {
        participant.setPunchDays(participant.getPunchDays() + 1);
        if (actionFile != null) {
            participant.setActionFile(actionFile);
        }
        participantMapper.updateById(participant);
    }

    /**
     * 标记用户今日已打卡（写入Redis，24小时过期）
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @param date        日期
     */
    private void markAsPunched(Long userId, Long challengeId, LocalDate date) {
        String punchKey = PUNCH_PREFIX + userId + ":" + challengeId + ":" + date;
        redisTemplate.opsForValue().set(punchKey, "1", java.time.Duration.ofDays(1));
    }

    /**
     * 批量处理挑战封面图片URL
     * 
     * @param challenges 挑战列表
     * @return 处理后的挑战列表
     */
    private List<Challenge> processChallengeImages(List<Challenge> challenges) {
        for (Challenge challenge : challenges) {
            processChallengeImage(challenge);
        }
        return challenges;
    }

    /**
     * 处理单个挑战封面图片URL（带Redis缓存）
     * 
     * 【这个方法做什么？】
     * 把数据库里存的图片路径转换成可以在浏览器访问的完整URL。
     * 同时使用 Redis 缓存，避免每次都去 MinIO 生成URL。
     * 
     * 【为什么要缓存？】
     * MinIO 生成URL需要计算签名，比较耗时。
     * 图片URL一般不会变化，缓存6小时可以大大减少服务器压力。
     * 
     * 【处理流程】
     * 1. 检查挑战是否有封面图片
     * 2. 尝试从Redis缓存获取URL
     * 3. 缓存命中：直接使用缓存的URL
     * 4. 缓存未命中：调用MinIO生成URL，并存入缓存
     * 
     * @param challenge 挑战实体
     */
    private void processChallengeImage(Challenge challenge) {
        // 【第1步：检查是否有封面图片】
        // 如果没有封面图片，直接返回，不做任何处理
        if (challenge.getCoverImage() != null && !challenge.getCoverImage().isEmpty()) {
            try {
                // 【第2步：构建缓存键】
                // 格式：challenge:image:挑战ID
                // 例如：challenge:image:5 表示挑战5的封面图片URL
                String cacheKey = CHALLENGE_IMAGE_CACHE_KEY + challenge.getId();
                
                // 【第3步：尝试从Redis获取缓存的URL】
                // redisTemplate.opsForValue().get() 从Redis读取字符串值
                String cachedUrl = (String) redisTemplate.opsForValue().get(cacheKey);
                
                if (cachedUrl != null && !cachedUrl.isEmpty()) {
                    // 【情况A：缓存命中】
                    // Redis里有缓存的URL，直接使用，不需要再去MinIO生成
                    log.debug("挑战封面URL缓存命中: challengeId={}", challenge.getId());
                    challenge.setCoverImage(cachedUrl);
                } else {
                    // 【情况B：缓存未命中】
                    // Redis里没有缓存，需要调用MinIO生成URL
                    
                    // 调用存储服务生成可访问的URL
                    // storageService.getFileUrl() 会处理两种情况：
                    // 1. 如果传入的是对象名（如 "covers/abc.jpg"），会生成带签名的URL
                    // 2. 如果传入的已经是完整URL，直接返回
                    String processedUrl = storageService.getFileUrl(challenge.getCoverImage());
                    challenge.setCoverImage(processedUrl);
                    
                    // 【第4步：写入Redis缓存】
                    // 把生成的URL存入Redis，设置6小时过期
                    // 这样下次查询同样的挑战时，可以直接从缓存获取
                    redisTemplate.opsForValue().set(cacheKey, processedUrl, CACHE_EXPIRE_HOURS, TimeUnit.HOURS);
                    log.debug("挑战封面URL已缓存: challengeId={}, cacheKey={}", challenge.getId(), cacheKey);
                }
            } catch (Exception e) {
                // 【异常处理】
                // 如果缓存或URL生成失败，只记录警告日志，不抛异常
                // 这样即使Redis挂了，主流程也能继续（只是没有缓存加速）
                log.warn("生成封面图片URL失败: challengeId={}, coverImage={}", challenge.getId(), challenge.getCoverImage(), e);
            } 
        }
    }

    /**
     * 构建挑战报告DTO
     * 
     * 【为什么用DTO而不是字符串？】
     * 1. 前端可以直接使用数据，不需要解析文本
     * 2. 数据结构清晰，便于前端展示图表、排行榜等
     * 3. 方便扩展，以后可以增加更多字段
     * 
     * @param challenge    挑战实体
     * @param participants 参与者列表
     * @return 结构化的报告DTO
     */
    private ChallengeReportDto buildChallengeReport(Challenge challenge,
                                                                           List<ChallengeParticipant> participants) {
        // 创建DTO对象
        ChallengeReportDto report = new ChallengeReportDto();
        
        // 设置基本信息
        report.setChallengeName(challenge.getChallengeName());
        report.setStartDate(challenge.getStartDate().toString());
        report.setEndDate(challenge.getEndDate().toString());
        report.setParticipantCount(participants.size());
        
        // 计算总天数（用于计算完成率）
        int totalDays = (int) java.time.temporal.ChronoUnit.DAYS.between(
                challenge.getStartDate(), challenge.getEndDate()) + 1;
        
        // 转换参与者列表
        List<ChallengeReportDto.ParticipantDto> participantDtos = 
                new java.util.ArrayList<>();
        
        for (ChallengeParticipant p : participants) {
            ChallengeReportDto.ParticipantDto dto = 
                    new ChallengeReportDto.ParticipantDto();
            dto.setUserId(p.getUserId());
            dto.setPunchDays(p.getPunchDays());
            
            // 计算完成率：打卡天数 / 总天数 * 100
            double completionRate = totalDays > 0 ? 
                    (double) p.getPunchDays() / totalDays * 100 : 0;
            // 保留一位小数
            dto.setCompletionRate(Math.round(completionRate * 10) / 10.0);
            
            // 设置打卡图片URL（数据库已存储完整URL，直接使用）
            dto.setActionFile(p.getActionFile());
            
            participantDtos.add(dto);
        }
        
        report.setParticipants(participantDtos);
        return report;
    }

    /**
     * 根据ID获取组，不存在时抛出异常
     * 
     * @param groupId 组ID
     * @return 组实体
     * @throws BizException 组不存在时抛出
     */
    private PartnerGroup getGroupOrThrow(Long groupId) {
        PartnerGroup group = partnerGroupMapper.selectById(groupId);
        if (group == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "搭子组不存在");
        }
        return group;
    }



    /**
     * 更新即将开始的挑战状态（未开始 → 进行中）
     * 
     * <p>
     * 由定时任务调用，将开始日期小于等于今天的"未开始"挑战状态更新为"进行中"。
     * </p>
     * 
     * @param now 当前日期
     */
    private void updateUpcomingChallenges(LocalDate now) {
        // 使用 MyBatis-Plus 的 LambdaQueryWrapper 替代手写 SQL
        // 查询条件：status = 0（未开始）且 start_date <= 今天
        List<Challenge> upcomingChallenges = challengeMapper.selectList(
                new LambdaQueryWrapper<Challenge>()
                        .eq(Challenge::getStatus, 0)       // 状态为"未开始"
                        .le(Challenge::getStartDate, now) // 开始日期 <= 今天
        );
        for (Challenge challenge : upcomingChallenges) {
            challenge.setStatus(1); // 进行中
            // 使用条件更新，避免更新不存在的字段
            challengeMapper.update(challenge, 
                com.baomidou.mybatisplus.core.toolkit.Wrappers.<Challenge>lambdaUpdate()
                    .eq(Challenge::getId, challenge.getId())
                    .set(Challenge::getStatus, challenge.getStatus()));
            log.info("挑战状态更新：挑战ID={}，状态从'未开始'更新为'进行中'，开始日期={}", 
                    challenge.getId(), challenge.getStartDate());
        }
    }
    
    /**
     * 检查用户是否参与了指定挑战
     * 
     * @param userId      用户ID
     * @param challengeId 挑战ID
     * @return true-已参与，false-未参与
     */
    @Override
    public boolean checkUserChallengeParticipation(Long userId, Long challengeId) {
        ChallengeParticipant participant = participantMapper.selectOne(
                new LambdaQueryWrapper<ChallengeParticipant>()
                        .eq(ChallengeParticipant::getUserId, userId)
                        .eq(ChallengeParticipant::getChallengeId, challengeId));
        return participant != null;
    }

    /**
     * 删除结束超过指定天数的挑战及其参与记录（定时任务调用）
     * 
     * <p>
     * 清理流程：
     * <ol>
     *   <li>查询符合条件的已结束挑战（status=2 且 endDate <= 截止日期）</li>
     *   <li>先删除参与记录（外键安全）</li>
     *   <li>再删除挑战主记录</li>
     *   <li>清除相关Redis缓存</li>
     * </ol>
     * </p>
     * 
     * @param daysAfterEnd 结束后的天数，如7表示删除结束超过7天的挑战
     * @return 删除的挑战数量
     */
    @Override
    @Transactional
    public int deleteExpiredChallenges(int daysAfterEnd) {
        // 计算截止日期：结束日期 <= 该日期的已结束挑战将被删除
        // 例如：daysAfterEnd=7，今天是 2025-02-27，则 cutoff=2025-02-20
        // 删除 endDate <= 2025-02-20 的挑战（即结束超过或等于7天的）
        LocalDate cutoff = LocalDate.now().minusDays(daysAfterEnd);

        // 查询符合条件的挑战：status=2（已结束）且 endDate <= cutoff
        List<Challenge> expired = challengeMapper.selectList(
                new LambdaQueryWrapper<Challenge>()
                        .eq(Challenge::getStatus, 2)
                        .le(Challenge::getEndDate, cutoff)
        );

        if (expired.isEmpty()) {
            log.info("[挑战清理] 没有需要删除的过期挑战（截止日期: {}）", cutoff);
            return 0;
        }

        List<Long> ids = expired.stream()
                .map(Challenge::getId)
                .collect(java.util.stream.Collectors.toList());

        // 先删除小表中的参与记录
        int deletedParticipants = participantMapper.delete(
                new LambdaQueryWrapper<ChallengeParticipant>()
                        .in(ChallengeParticipant::getChallengeId, ids)
        );

        // 再删除主表挑战记录
        int deletedChallenges = challengeMapper.deleteBatchIds(ids);

        // 清除对应的 Redis 缓存（封面图片URL缓存、参与人数缓存）
        for (Long id : ids) {
            try {
                redisTemplate.delete(CHALLENGE_IMAGE_CACHE_KEY + id);
                redisTemplate.delete(CHALLENGE_PARTICIPANTS_PREFIX + id);
            } catch (Exception e) {
                log.warn("[挑战清理] 清除 Redis 缓存失败: challengeId={}", id, e);
            }
        }

        log.info("[挑战清理] 删除过期挑战 {} 条，参与记录 {} 条（截止日期: {}）",
                deletedChallenges, deletedParticipants, cutoff);
        return deletedChallenges;
    }
    
    /**
     * 更新已到期的进行中挑战状态（进行中 → 已结束）
     * 
     * <p>
     * 由定时任务调用，将结束日期小于今天的"进行中"挑战状态更新为"已结束"。
     * </p>
     * 
     * @param now 当前日期
     */
    private void updateActiveChallenges(LocalDate now) {
        // 使用 MyBatis-Plus 的 LambdaQueryWrapper 替代手写 SQL
        // 查询条件：status = 1（进行中）且 end_date < 今天
        List<Challenge> activeChallenges = challengeMapper.selectList(
                new LambdaQueryWrapper<Challenge>()
                        .eq(Challenge::getStatus, 1)     // 状态为"进行中"
                        .lt(Challenge::getEndDate, now) // 结束日期 < 今天
        );
        for (Challenge challenge : activeChallenges) {
            challenge.setStatus(2); // 已结束
            // 使用条件更新，避免更新不存在的字段
            challengeMapper.update(challenge, 
                com.baomidou.mybatisplus.core.toolkit.Wrappers.<Challenge>lambdaUpdate()
                    .eq(Challenge::getId, challenge.getId())
                    .set(Challenge::getStatus, challenge.getStatus()));
            log.info("挑战状态更新：挑战ID={}，状态从'进行中'更新为'已结束'，结束日期={}", 
                    challenge.getId(), challenge.getEndDate());
        }
    }
}