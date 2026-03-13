package com.gym.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gym.entity.ChallengeParticipant;
import org.apache.ibatis.annotations.Mapper;

/**
 * 挑战参与者数据访问层
 * 
 * 【MyBatis-Plus 的 BaseMapper】
 * 继承 BaseMapper 后，自动拥有以下常用方法：
 * - selectById(id)：根据ID查询
 * - selectList(wrapper)：条件查询列表
 * - selectOne(wrapper)：条件查询单条
 * - selectCount(wrapper)：条件统计数量
 * - insert(entity)：插入
 * - updateById(entity)：根据ID更新
 * - deleteById(id)：根据ID删除
 * 
 * 【统计参与人数示例】
 * Long count = participantMapper.selectCount(
 *     new LambdaQueryWrapper<ChallengeParticipant>()
 *         .eq(ChallengeParticipant::getChallengeId, challengeId)
 * );
 */
@Mapper
public interface ChallengeParticipantMapper extends BaseMapper<ChallengeParticipant> {
    // 所有常用方法已由 BaseMapper 提供，无需额外定义
}








