package com.gym.config;

import com.gym.entity.User;
import com.gym.mapper.UserMapper;
import com.gym.util.JwtUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * ============================================
 * JWT 认证过滤器
 * ============================================
 *
 * 【什么是过滤器？】
 * 过滤器（Filter）是 Servlet 规范中的组件，在请求到达 Controller 之前拦截处理。
 * 就像机场的安检，每个人（请求）都要经过检查，合格才能进入。
 *
 * 【本过滤器的作用】
 * 检查 HTTP 请求头中是否携带有效的 JWT Token，
 * 如果有效，将用户信息注入 Spring Security 的上下文，后续代码可以通过它获取当前用户。
 *
 * 【继承 OncePerRequestFilter 的原因】
 * 普通的 Filter 可能在转发、包含等情况下被多次执行。
 * OncePerRequestFilter 保证每个请求只过滤一次，避免重复处理。
 *
 * 【JWT 认证流程】
 * 1. 客户端登录获取 JWT → 2. 后续请求在 Header 中携带 JWT
 * 3. 本过滤器解析 JWT → 4. 验证通过后注入用户身份
 * 5. Controller 通过 SecurityContext 获取 userId
 *
 * 【Authorization 头格式】
 * Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.xxx.yyy
 * - "Bearer " 是固定的前缀（表示"持票人"）
 * - 后面的字符串就是 JWT Token
 * ============================================
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    /**
     * JWT 工具类，用于解析 Token
     */
    private final JwtUtils jwtUtils;

    /**
     * 用户 Mapper，用于根据 userId 查询用户信息
     */
    private final UserMapper userMapper;

    /**
     * 核心过滤逻辑：每个请求都会经过这里
     *
     * 【执行流程】
     * 1. 从请求头获取 Authorization
     * 2. 检查格式是否为 "Bearer xxx"
     * 3. 解析 JWT 获取 userId
     * 4. 查询数据库验证用户存在
     * 5. 创建认证对象并放入 SecurityContext
     * 6. 放行请求（无论认证成功与否都要放行）
     *
     * 【为什么解析失败也要放行？】
     * 过滤器只负责"尝试认证"，不负责"拒绝请求"。
     * 如果 Token 无效，SecurityContext 中没有认证信息，
     * 后续的 @PreAuthorize 或 SecurityConfig 会拦截未认证请求。
     * 这样设计是职责分离：过滤器只管认证，鉴权交给 Spring Security。
     *
     * @param request     HTTP 请求对象
     * @param response    HTTP 响应对象
     * @param filterChain 过滤器链，调用 doFilter 放行到下一个过滤器
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 【第1步：获取 Authorization 请求头】
        // HttpHeaders.AUTHORIZATION = "Authorization"
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        // 【第2步：检查请求头格式】
        // 必须满足：不为空，且以 "Bearer " 开头（注意有空格）
        // 如果不满足，说明这不是 JWT 认证请求，直接放行
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 【第3步：提取 Token】
        // "Bearer " 占 7 个字符，从第7位开始截取就是 Token
        String token = authHeader.substring(7);

        try {
            // 【第4步：解析 JWT】
            // parse 方法会验证签名和过期时间，失败会抛出异常
            Claims claims = jwtUtils.parse(token);

            // 【第5步：获取用户ID】
            // JWT 的 subject 字段存的是 userId（字符串）
            Long userId = Long.valueOf(claims.getSubject());

            // 【第6步：查询用户】
            // 验证用户是否真实存在（防止 Token 有效但用户已被删除的情况）
            User user = userMapper.selectById(userId);
            if (user == null) {
                filterChain.doFilter(request, response);
                return;
            }

            // 【第7步：创建权限对象】
            // SimpleGrantedAuthority 是 Spring Security 的权限表示
            // 格式："ROLE_" + 角色名，如 "ROLE_USER"、"ROLE_ADMIN"
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole());

            // 【第8步：创建认证令牌】
            // UsernamePasswordAuthenticationToken 是 Spring Security 的认证对象
            // 参数：principal（主体，这里是 userId）、credentials（凭证，这里不需要）、authorities（权限列表）
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of(authority));

            // 【第9步：将认证信息存入上下文】
            // SecurityContextHolder 是线程绑定的，后续代码可以通过它获取当前用户
            // 例如：Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            // 解析失败（Token 无效或过期），不做任何处理
            // 后续的安全配置会拦截没有认证信息的请求
        }

        // 【第10步：放行请求】
        // 无论认证成功还是失败，都必须调用 doFilter 让请求继续
        // 否则请求会被卡住，永远不会到达 Controller
        filterChain.doFilter(request, response);
    }
}








