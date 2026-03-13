package com.gym.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gym.entity.GroupMember;
import org.apache.ibatis.annotations.Mapper;

/**
 * 组成员数据访问层
 * 
 * 【MyBatis-Plus 的 BaseMapper】
 * 继承 BaseMapper 后，自动拥有常用 CRUD 方法，详见其他 Mapper 注释。
 * 
 * 【统计搭子数量示例】
 * // 统计用户的搭子数量（排除自己是组长的组）
 * Long count = groupMemberMapper.selectCount(
 *     new LambdaQueryWrapper<GroupMember>()
 *         .eq(GroupMember::getUserId, userId)
 *         .ne(GroupMember::getRole, "OWNER")
 * );
 */
@Mapper
public interface GroupMemberMapper extends BaseMapper<GroupMember> {
}








