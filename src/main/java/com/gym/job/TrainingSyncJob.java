package com.gym.job;

import com.gym.entity.TrainRecord;
import com.gym.mapper.TrainRecordMapper;
import com.gym.service.StatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.data.redis.core.RedisTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * 定时任务：将 Redis 实时进度同步落库，保证最终一致性
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrainingSyncJob {

    private static final String PREFIX = "train:progress:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final TrainRecordMapper trainRecordMapper;
    private final StatService statService;

    /**
     * 每分钟同步一次
     */
    @Scheduled(cron = "0 * * * * ?")
    public void sync() {
        Set<String> keys = redisTemplate.keys(PREFIX + "*");
        if (CollectionUtils.isEmpty(keys)) {
            return;
        }
        for (String key : keys) {
            Object hash = redisTemplate.opsForHash().entries(key);
            if (!(hash instanceof java.util.Map)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            java.util.Map<Object, Object> map = (java.util.Map<Object, Object>) hash;
            // key 结构 train:progress:{groupId}:{date}
            String[] parts = key.split(":");
            if (parts.length < 4) {
                continue;
            }
            Long groupId = Long.valueOf(parts[2]);
            LocalDate date = LocalDate.parse(parts[3]);

            for (var entry : map.entrySet()) {
                Long userId = Long.valueOf(entry.getKey().toString());
                String val = entry.getValue().toString(); // done/target
                String[] dt = val.split("/");
                int done = Integer.parseInt(dt[0]);
                int target = dt.length > 1 ? Integer.parseInt(dt[1]) : done;

                TrainRecord record = trainRecordMapper.selectOne(
                        com.baomidou.mybatisplus.core.toolkit.Wrappers.<TrainRecord>lambdaQuery()
                                .eq(TrainRecord::getUserId, userId)
                                .eq(TrainRecord::getTrainDate, date)
                );
                if (record == null) {
                    record = new TrainRecord();
                    record.setUserId(userId);
                    record.setGroupId(groupId);
                    record.setTrainDate(date);
                    record.setCompleteCount(done);
                    record.setStatus(done >= target ? 1 : 0);
                    record.setCreateTime(LocalDateTime.now());
                    record.setUpdateTime(LocalDateTime.now());
                    trainRecordMapper.insert(record);
                } else {
                    record.setCompleteCount(Math.max(done, record.getCompleteCount() == null ? 0 : record.getCompleteCount()));
                    record.setStatus(record.getCompleteCount() >= target ? 1 : record.getStatus());
                    record.setUpdateTime(LocalDateTime.now());
                    trainRecordMapper.updateById(record);
                }
            }
        }
    }
}



