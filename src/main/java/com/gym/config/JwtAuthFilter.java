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

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 🔥 修复：整个逻辑全部包进 try-catch，防止任何一行抛异常
        try {
            String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

            if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            // 🔥 这行现在安全了！
            String token = authHeader.substring(7);

            Claims claims = jwtUtils.parse(token);
            Long userId = Long.valueOf(claims.getSubject());

            User user = userMapper.selectById(userId);
            if (user == null) {
                filterChain.doFilter(request, response);
                return;
            }

            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole());

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of(authority));

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            // 🔥 关键：捕获所有异常，绝对不往外抛！
            System.err.println("JWT认证异常：" + e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}