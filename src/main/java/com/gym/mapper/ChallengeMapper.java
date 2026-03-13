package com.gym.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gym.entity.Challenge;
import org.apache.ibatis.annotations.Mapper;

/**
 * 挑战数据访问层
 * 
 * 【MyBatis-Plus 的 BaseMapper】
 * 继承 BaseMapper 后，自动拥有以下常用方法，无需手写 SQL：
 * - selectById(id)：根据ID查询
 * - selectList(wrapper)：条件查询列表
 * - selectOne(wrapper)：条件查询单条
 * - insert(entity)：插入
 * - updateById(entity)：根据ID更新
 * - deleteById(id)：根据ID删除
 * 
 * 【LambdaQueryWrapper 示例】
 * challengeMapper.selectList(
 *     new LambdaQueryWrapper<Challenge>()
 *         .eq(Challenge::getStatus, 1)  // WHERE status = 1
 *         .le(Challenge::getStartDate, now)  // AND start_date <= now
 * );
 */
@Mapper
public interface ChallengeMapper extends BaseMapper<Challenge> {
    // 所有常用方法已由 BaseMapper 提供，无需额外定义
}








