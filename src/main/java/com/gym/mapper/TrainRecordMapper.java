package com.gym.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gym.entity.TrainRecord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 训练记录 Mapper
 * 继承 BaseMapper<TrainRecord>，自动拥有以下 MyBatis-Plus 内置方法：
 *
 * 常用查询：
 *   selectById(id)               - 按主键查询
 *   selectList(queryWrapper)     - 按条件查询列表
 *   selectCount(queryWrapper)    - 按条件统计数量
 *   selectOne(queryWrapper)      - 按条件查询单条
 *
 * 常用写入：
 *   insert(entity)               - 插入记录
 *   updateById(entity)           - 按主键更新
 *   update(entity, queryWrapper) - 按条件更新
 *   deleteById(id)               - 按主键删除
 *
 * 使用示例（Service 中）：
 *   // 查询用户的所有训练记录
 *   trainRecordMapper.selectList(
 *       new QueryWrapper<TrainRecord>().eq("user_id", userId)
 *   );
 *
 *   // 统计用户训练次数
 *   trainRecordMapper.selectCount(
 *       new QueryWrapper<TrainRecord>().eq("user_id", userId)
 *   );
 *
 *   // 查询今日训练记录
 *   trainRecordMapper.selectList(
 *       new QueryWrapper<TrainRecord>()
 *           .eq("user_id", userId)
 *           .eq("train_date", LocalDate.now())
 *   );
 */
@Mapper
public interface TrainRecordMapper extends BaseMapper<TrainRecord> {
    
}
