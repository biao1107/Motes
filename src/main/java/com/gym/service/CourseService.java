package com.gym.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.gym.entity.Course;

import java.util.List;

/**
 * ============================================
 * 课程服务接口
 * ============================================
 * 
 * 【什么是服务接口？】
 * 服务接口定义了"课程"功能的所有操作，就像餐厅菜单列出所有菜品。
 * 实现类（CourseServiceImpl）负责具体实现这些功能。
 * 
 * 【课程功能包括】
 * 1. 查看课程列表（分页、筛选、排序）
 * 2. 查看课程详情
 * 3. 搜索课程
 * 4. 获取推荐课程
 * 5. 管理员：创建、编辑、删除课程
 * 
 * 【分页查询说明】
 * IPage 和 Page 是 MyBatis-Plus 提供的分页工具
 * - Page：分页参数（当前页、每页大小）
 * - IPage：分页结果（数据列表、总记录数、总页数）
 * 
 * 例如：查询第1页，每页10条
 * Page<Course> page = new Page<>(1, 10);
 * IPage<Course> result = courseService.getCourseList(page, null, null);
 * ============================================
 */
public interface CourseService {
    
    /**
     * 分页查询课程列表
     * 
     * 【使用场景】课程列表页，显示所有课程
     * 【参数说明】
     * - page: 分页参数（第几页、每页几条）
     * - courseType: 课程类型筛选（如YOGA、CARDIO），null表示不筛选
     * - difficulty: 难度筛选（如BEGINNER、ADVANCED），null表示不筛选
     * 【返回值】IPage包含：当前页数据、总记录数、总页数等
     */
    IPage<Course> getCourseList(Page<Course> page, String courseType, String difficulty);
    
    /**
     * 根据ID获取课程详情
     * 
     * 【使用场景】点击课程卡片进入详情页
     * 【参数】id - 课程的唯一标识
     * 【返回值】Course对象，包含课程的所有信息
     */
    Course getCourseById(Long id);
    
    /**
     * 获取推荐课程列表
     * 
     * 【使用场景】首页展示推荐课程
     * 【参数】limit - 最多返回几条，如6表示只显示6个推荐课程
     * 【排序规则】按sort_weight降序，权重高的排在前面
     */
    List<Course> getRecommendCourses(int limit);
    
    /**
     * 根据类型获取课程列表
     * 
     * 【使用场景】分类页面，如"瑜伽课程"、"力量训练"
     * 【参数】
     * - courseType: 课程类型代码
     * - limit: 最多返回几条
     */
    List<Course> getCoursesByType(String courseType, int limit);
    
    /**
     * 搜索课程
     * 
     * 【使用场景】顶部搜索框，用户输入关键词搜索
     * 【参数】
     * - keyword: 搜索关键词，匹配课程名称和描述
     * - page: 分页参数
     * 【示例】搜索"腹肌"，返回所有名称或描述包含"腹肌"的课程
     */
    IPage<Course> searchCourses(String keyword, Page<Course> page);

}