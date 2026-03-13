package com.gym.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.gym.config.JwtAuthFilter;

/**
 * ============================================
 * Spring Security 安全配置类
 * ============================================
 *
 * 【什么是 Spring Security？】
 * Spring Security 是一个强大的安全框架，提供：
 * - 认证（Authentication）：验证"你是谁"（登录）
 * - 授权（Authorization）：验证"你能做什么"（权限控制）
 *
 * 【本项目的安全策略】
 * 本项目使用 JWT + Spring Security 的无状态认证方案：
 * 1. 用户登录后获得 JWT Token
 * 2. 后续请求携带 JWT，JwtAuthFilter 解析并认证
 * 3. 不需要 Session，服务器不保存登录状态
 *
 * 【@EnableWebSecurity 的作用】
 * 启用 Spring Security 的 Web 安全支持。
 * 没有这个注解，Spring Security 不会生效。
 *
 * 【SecurityFilterChain 是什么？】
 * 这是 Spring Security 6+ 的新配置方式（替代旧的 WebSecurityConfigurerAdapter）。
 * 通过链式调用配置各种安全规则，最终 build() 生成过滤器链。
 * ============================================
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /**
     * JWT 认证过滤器，在 UsernamePasswordAuthenticationFilter 之前执行
     */
    private final JwtAuthFilter jwtAuthFilter;

    /**
     * 配置安全过滤器链
     *
     * 【配置说明】
     * 1. CORS：开启跨域支持（具体规则在 CorsConfig 中）
     * 2. CSRF：禁用（因为使用 JWT，不需要防范 CSRF）
     * 3. Session：无状态（STATELESS），不创建 HttpSession
     * 4. 授权规则：
     *    - 白名单路径：无需认证即可访问
     *    - 其他路径：本项目暂时全部放行（.permitAll()），实际由业务逻辑控制权限
     * 5. 表单登录：禁用（使用 JWT 而非表单登录）
     * 6. 过滤器：将 JwtAuthFilter 添加到认证过滤器之前
     *
     * 【白名单路径说明】
     * - /swagger-ui/**：Swagger API 文档页面
     * - /v3/api-docs/**：Swagger API 文档数据
     * - /actuator/health：健康检查端点
     * - /auth/**：登录、注册等认证接口
     * - /ws/**：WebSocket 连接端点（握手时单独认证）
     *
     * 【为什么 .anyRequest().permitAll()？】
     * 本项目采用"宽松认证"策略：
     * - Security 层只负责解析 JWT、注入用户身份
     * - 具体接口的权限控制由 Controller/Service 层通过获取当前用户 ID 来实现
     * 这样设计更灵活，适合 RESTful API 项目。
     *
     * @param http HttpSecurity 配置对象
     * @return 配置好的 SecurityFilterChain
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 【1. 开启 CORS】
                // Customizer.withDefaults() 表示使用 Spring 容器中已有的 CorsConfigurationSource
                // 即 CorsConfig 中配置的 CorsFilter
                .cors(Customizer.withDefaults())

                // 【2. 禁用 CSRF】
                // CSRF 攻击针对的是基于 Session 的表单提交
                // 本项目使用 JWT，每次请求都需携带 Token，天然免疫 CSRF
                .csrf(csrf -> csrf.disable())

                // 【3. 无状态 Session】
                // STATELESS = 不创建、不使用 HttpSession
                // 每次请求都通过 JWT 认证，服务器不保存会话状态
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 【4. 配置授权规则】
                .authorizeHttpRequests(auth -> auth
                        // 白名单：这些路径无需认证
                        .requestMatchers(
                                "/swagger-ui/**",      // Swagger UI 页面
                                "/swagger-ui.html",    // Swagger UI 入口
                                "/v3/api-docs/**",     // OpenAPI 文档数据
                                "/actuator/health",    // 健康检查
                                "/auth/**",            // 登录、注册接口
                                "/ws/**"               // WebSocket 端点
                        ).permitAll()
                        // 其他所有请求：本项目暂时全部放行
                        .anyRequest().permitAll()
                )

                // 【5. 禁用表单登录】
                // 传统 Web 应用使用表单登录，本项目是 RESTful API，使用 JWT
                .formLogin(form -> form.disable())

                // 【6. 添加 JWT 过滤器】
                // 在 UsernamePasswordAuthenticationFilter 之前执行 JwtAuthFilter
                // 这样每次请求都会先尝试 JWT 认证
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * 密码加密器
     *
     * 【为什么需要密码加密？】
     * 数据库中不能明文存储密码（防止数据泄露后用户密码暴露）。
     * BCrypt 是一种安全的哈希算法，特点：
     * - 单向性：无法从哈希值反推原始密码
     * - 随机盐：每次加密结果不同，防止彩虹表攻击
     * - 慢计算：增加暴力破解成本
     *
     * 【使用方式】
     * - 注册时：passwordEncoder.encode(明文密码) → 存入数据库
     * - 登录时：passwordEncoder.matches(明文, 密文) → 验证是否匹配
     *
     * @return BCryptPasswordEncoder 实例
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
