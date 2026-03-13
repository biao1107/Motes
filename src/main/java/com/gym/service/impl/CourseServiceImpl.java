package com.gym.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gym.entity.Course;
import com.gym.mapper.CourseMapper;
import com.gym.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * ============================================
 * 课程服务实现类
 * ============================================
 * 
 * 【什么是服务实现类？】
 * 这个类实现了 CourseService 接口定义的所有功能。
 * 就像厨师根据菜单（接口）做菜（实现），这里是具体的业务逻辑代码。
 * 
 * 【课程功能的核心流程】
 * 1. 查询课程列表：从数据库查询 → 返回给前端
 * 2. 课程详情：先查Redis缓存 → 缓存未命中再查数据库 → 返回
 * 3. 推荐课程：按权重排序 → 取前N条 → 返回
 * 4. 搜索课程：模糊匹配名称和描述 → 分页返回
 * 
 * 【课程缓存策略】
 * - 课程详情：缓存整个Course对象（JSON格式），有效期6小时
 * - 缓存键格式：course:detail:{课程ID}
 * - 缓存命中：直接返回，无需查询数据库
 * - 缓存未命中：查询数据库后存入Redis
 * 
 * 【用到的技术】
 * - @Service：标记这是Spring服务类
 * - LambdaQueryWrapper：MyBatis-Plus的条件构造器
 * - IPage/Page：MyBatis-Plus分页工具
 * - RedisTemplate：Redis缓存操作
 * - ObjectMapper：JSON序列化/反序列化
 * ============================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseServiceImpl implements CourseService {
    
    // 【依赖注入】由Spring自动创建并注入
    private final CourseMapper courseMapper;      // 操作课程数据库
    private final RedisTemplate<String, String> redisTemplate;  // Redis缓存
    private final ObjectMapper objectMapper;      // JSON序列化工具
    
    // ==================== Redis缓存配置 ====================
    
    /**
     * Redis缓存键前缀：课程详情（整个对象）
     * 格式：course:detail:课程ID
     * 例如：course:detail:5 表示课程5的完整信息
     */
    private static final String COURSE_DETAIL_CACHE_KEY = "course:detail:";
    
    /**
     * 缓存有效期：6小时
     * 课程信息不会频繁变化，6小时足够用
     */
    private static final long CACHE_EXPIRE_HOURS = 6;
    
    /**
     * 分页查询课程列表
     * 
     * 【实现流程】
     * 1. 创建查询条件：只查status=1（上架）的课程
     * 2. 添加筛选条件：如果传了courseType或difficulty，就加上
     * 3. 设置排序：先按sortWeight降序，再按createTime降序
     * 4. 执行分页查询
     * 5. 返回结果
     * 
     * 【注意】列表查询不缓存，因为数据量大且筛选条件多变
     */
    @Override
    public IPage<Course> getCourseList(Page<Course> page, String courseType, String difficulty) {
        log.info("查询课程列表: courseType={}, difficulty={}", courseType, difficulty);
        
        // 【第1步：创建查询条件构造器】
        LambdaQueryWrapper<Course> queryWrapper = new LambdaQueryWrapper<>();
        
        // 【第2步：只查询上架的课程】
        queryWrapper.eq(Course::getStatus, 1);
        
        // 【第3步：按类型筛选（如果传了参数）】
        if (courseType != null && !courseType.isEmpty()) {
            queryWrapper.eq(Course::getCourseType, courseType);
        }
        
        // 【第4步：按难度筛选（如果传了参数）】
        if (difficulty != null && !difficulty.isEmpty()) {
            queryWrapper.eq(Course::getDifficulty, difficulty);
        }
        
        // 【第5步：设置排序规则】
        queryWrapper.orderByDesc(Course::getSortWeight, Course::getCreateTime);
        
        // 【第6步：执行分页查询并返回】
        return courseMapper.selectPage(page, queryWrapper);
    }
    
    /**
     * 根据ID获取课程详情（带Redis缓存）
     * 
     * 【缓存策略】
     * 1. 先从Redis获取缓存的课程JSON
     * 2. 缓存命中：反序列化后直接返回
     * 3. 缓存未命中：查询数据库，将结果存入Redis
     * 
     * 【为什么要缓存整个对象？】
     * - 减少数据库查询次数
     * - 提升接口响应速度
     * - 课程信息不常变化，适合缓存
     */
    @Override
    public Course getCourseById(Long id) {
        log.info("查询课程详情: id={}", id);
        
        String cacheKey = COURSE_DETAIL_CACHE_KEY + id;
        
        try {
            // 【第1步：尝试从Redis获取缓存】
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);
            
            if (cachedJson != null && !cachedJson.isEmpty()) {
                // 【情况A：缓存命中】反序列化JSON为Course对象
                log.debug("课程缓存命中: courseId={}", id);
                return objectMapper.readValue(cachedJson, Course.class);
            }
            
            // 【第2步：缓存未命中，查询数据库】
            LambdaQueryWrapper<Course> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Course::getId, id)
                       .eq(Course::getStatus, 1); // 只查询上架的课程
            
            Course course = courseMapper.selectOne(queryWrapper);
            
            // 【第3步：将结果存入Redis缓存】
            if (course != null) {
                String json = objectMapper.writeValueAsString(course);
                redisTemplate.opsForValue().set(cacheKey, json, CACHE_EXPIRE_HOURS, TimeUnit.HOURS);
                log.debug("课程已缓存: courseId={}", id);
            }
            
            // 【第4步：返回结果】
            return course;
            
        } catch (Exception e) {
            // 【异常处理】缓存失败时降级为直接查询数据库
            log.warn("课程缓存处理失败，降级为数据库查询: courseId={}", id, e);
            return courseMapper.selectById(id);
        }
    }
    
    /**
     * 获取推荐课程列表
     * 
     * 【实现流程】
     * 1. 构建查询条件：status=1，按sortWeight和createTime降序
     * 2. 限制返回数量
     * 3. 执行查询并返回
     */
    @Override
    public List<Course> getRecommendCourses(int limit) {
        log.info("获取推荐课程列表: limit={}", limit);
        
        LambdaQueryWrapper<Course> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Course::getStatus, 1)
                   .orderByDesc(Course::getSortWeight, Course::getCreateTime)
                   .last("LIMIT " + limit);
        
        return courseMapper.selectList(queryWrapper);
    }
    
    /**
     * 根据类型获取课程列表
     */
    @Override
    public List<Course> getCoursesByType(String courseType, int limit) {
        log.info("根据类型获取课程列表: courseType={}, limit={}", courseType, limit);
        
        LambdaQueryWrapper<Course> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Course::getCourseType, courseType)
                   .eq(Course::getStatus, 1)
                   .orderByDesc(Course::getSortWeight, Course::getCreateTime)
                   .last("LIMIT " + limit);
        
        return courseMapper.selectList(queryWrapper);
    }
    
    /**
     * 搜索课程
     */
    @Override
    public IPage<Course> searchCourses(String keyword, Page<Course> page) {
        log.info("搜索课程: keyword={}", keyword);
        
        LambdaQueryWrapper<Course> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Course::getStatus, 1)
                   .and(wrapper -> wrapper
                       .like(Course::getCourseName, keyword)
                       .or()
                       .like(Course::getDescription, keyword))
                   .orderByDesc(Course::getSortWeight, Course::getCreateTime);
        
        return courseMapper.selectPage(page, queryWrapper);
    }
    
    // ==================== 缓存管理方法 ====================
    
    /**
     * 清除课程缓存
     * 
     * 【使用场景】课程信息更新或删除时调用
     * 【作用】保证用户下次查询时能获取最新数据
     * 
     * @param courseId 课程ID
     */
    public void clearCourseCache(Long courseId) {
        try {
            String cacheKey = COURSE_DETAIL_CACHE_KEY + courseId;
            redisTemplate.delete(cacheKey);
            log.info("课程缓存已清除: courseId={}", courseId);
        } catch (Exception e) {
            log.warn("清除课程缓存失败: courseId={}", courseId, e);
        }
    }
}
