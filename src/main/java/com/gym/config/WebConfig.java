package com.gym.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * ============================================
 * Spring MVC Web 配置类
 * ============================================
 *
 * 【什么是 WebMvcConfigurer？】
 * 这是 Spring MVC 的配置接口，通过实现它可以自定义 Web 相关配置，
 * 如静态资源处理、视图解析、拦截器、跨域等。
 *
 * 【本类的作用】
 * 1. 配置静态资源映射（/static/**、/public/** 等）
 * 2. 配置根路径重定向（/ → index.html）
 *
 * 【静态资源 vs API 路径】
 * Spring Boot 默认会处理以下静态资源路径：
 * - /static/**
 * - /public/**
 * - /resources/**
 * - /META-INF/resources/**
 *
 * 如果请求的 URL 匹配静态资源路径，Spring 会直接返回文件；
 * 如果不匹配，才会交给 Controller 处理。
 *
 * 【为什么需要显式配置？】
 * 虽然 Spring Boot 有默认配置，但显式配置可以：
 * 1. 明确表达意图，提高代码可读性
 * 2. 避免某些边缘情况下静态资源和 API 路径冲突
 * 3. 方便后续扩展自定义行为
 * ============================================
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * 配置静态资源处理器
     *
     * 【功能说明】
     * 将 URL 路径映射到类路径下的资源目录，例如：
     * - 访问 /static/logo.png → 返回 classpath:/static/logo.png
     * - 访问 /webjars/jquery.js → 返回 classpath:/META-INF/resources/webjars/jquery.js
     *
     * 【配置的资源路径】
     * - /static/** → classpath:/static/
     * - /public/** → classpath:/public/
     * - /resources/** → classpath:/resources/
     * - /webjars/** → classpath:/META-INF/resources/webjars/
     *
     * 【与 API 路径的关系】
     * Spring Boot 会优先匹配 @RestController 定义的路径，
     * 如果匹配不到，才会尝试静态资源。
     * 所以 /api/user 这样的路径不会被当作静态资源处理。
     *
     * @param registry 资源处理器注册表
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 【配置 /static 路径】
        // 用于存放项目自身的静态资源（图片、CSS、JS 等）
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");

        // 【配置 /public 路径】
        // 用于存放对外公开的静态资源
        registry.addResourceHandler("/public/**")
                .addResourceLocations("classpath:/public/");

        // 【配置 /resources 路径】
        // Spring Boot 默认静态资源路径之一
        registry.addResourceHandler("/resources/**")
                .addResourceLocations("classpath:/resources/");

        // 【配置 /webjars 路径】
        // WebJars 是将前端库（如 jQuery、Bootstrap）打包成 JAR 的方式
        // 通过 Maven 引入后，静态资源在 JAR 包的 META-INF/resources/webjars/ 目录下
        registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/");
    }

    /**
     * 配置视图控制器
     *
     * 【功能说明】
     * 将某个 URL 路径直接映射到视图，无需编写 Controller 方法。
     * 适合简单的页面跳转场景。
     *
     * 【本配置的作用】
     * 访问根路径 / 时，自动转发到 /index.html
     * 这样用户访问 http://localhost:8080/ 就能看到首页。
     *
     * 【forward 的含义】
     * forward 是服务器内部转发，浏览器地址栏不变。
     * 与之相对的是 redirect（重定向），会让浏览器重新发起请求。
     *
     * @param registry 视图控制器注册表
     */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 将根路径 / 映射到 index.html
        // 例如：访问 http://localhost:8080/ → 显示 classpath:/static/index.html
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}