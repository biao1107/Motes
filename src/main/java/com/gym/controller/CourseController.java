package com.gym.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.gym.common.ApiResponse;
import com.gym.entity.Course;
import com.gym.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 课程控制器
 */
@RestController
@RequestMapping("/course")
@RequiredArgsConstructor
@Slf4j
public class CourseController {
    
    private final CourseService courseService;
    
    /**
     * 分页获取课程列表
     * @param page 页码
     * @param size 每页大小
     * @param courseType 课程类型
     * @param difficulty 难度等级
     * @return 课程列表
     */
    @GetMapping("/list")
    public ApiResponse<IPage<Course>> getCourseList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String courseType,
            @RequestParam(required = false) String difficulty) {
        
        try {
            Page<Course> pageParam = new Page<>(page, size);
            IPage<Course> result = courseService.getCourseList(pageParam, courseType, difficulty);
            return ApiResponse.ok(result);
        } catch (Exception e) {
            log.error("获取课程列表失败", e);
            return ApiResponse.error(500, "获取课程列表失败");
        }
    }
    
    /**
     * 获取课程详情
     * @param id 课程ID
     * @return 课程详情
     */
    @GetMapping("/{id}")
    public ApiResponse<Course> getCourseById(@PathVariable Long id) {
        try {
            Course course = courseService.getCourseById(id);
            if (course == null) {
                return ApiResponse.error(404, "课程不存在");
            }
            return ApiResponse.ok(course);
        } catch (Exception e) {
            log.error("获取课程详情失败: id={}", id, e);
            return ApiResponse.error(500, "获取课程详情失败");
        }
    }
    
    /**
     * 获取推荐课程
     * @param limit 限制数量
     * @return 推荐课程列表
     */
    @GetMapping("/recommend")
    public ApiResponse<List<Course>> getRecommendCourses(@RequestParam(defaultValue = "6") int limit) {
        try {
            List<Course> courses = courseService.getRecommendCourses(limit);
            return ApiResponse.ok(courses);
        } catch (Exception e) {
            log.error("获取推荐课程失败", e);
            return ApiResponse.error(500, "获取推荐课程失败");
        }
    }
    
    /**
     * 根据类型获取课程
     * @param courseType 课程类型
     * @param limit 限制数量
     * @return 课程列表
     */
    @GetMapping("/type/{courseType}")
    public ApiResponse<List<Course>> getCoursesByType(
            @PathVariable String courseType,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<Course> courses = courseService.getCoursesByType(courseType, limit);
            return ApiResponse.ok(courses);
        } catch (Exception e) {
            log.error("根据类型获取课程失败: courseType={}", courseType, e);
            return ApiResponse.error(500, "获取课程失败");
        }
    }
    
    /**
     * 搜索课程
     * @param keyword 关键词
     * @param page 页码
     * @param size 每页大小
     * @return 搜索结果
     */
    @GetMapping("/search")
    public ApiResponse<IPage<Course>> searchCourses(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Page<Course> pageParam = new Page<>(page, size);
            IPage<Course> result = courseService.searchCourses(keyword, pageParam);
            return ApiResponse.ok(result);
        } catch (Exception e) {
            log.error("搜索课程失败: keyword={}", keyword, e);
            return ApiResponse.error(500, "搜索课程失败");
        }
    }

}