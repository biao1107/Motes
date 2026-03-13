package com.gym.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * ============================================
 * JWT 工具类
 * ============================================
 *
 * 【什么是 JWT？】
 * JWT（JSON Web Token）是一种用于身份认证的令牌。
 * 就像你去图书馆借书，管理员给你一张借书证（JWT）。
 * 之后你每次来，只需出示借书证，不用重新登记。
 *
 * 【JWT 的结构】
 * JWT 由三部分组成，用"."分隔：
 *   Header.Payload.Signature
 *   头部  .  载荷  .  签名
 *
 * 例如：eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123
 *
 * - Header：声明算法类型（HS256）
 * - Payload：存放用户信息（如 userId），可被解码，但不能篡改
 * - Signature：用密钥对前两部分签名，保证数据完整性
 *
 * 【工作流程】
 * 1. 用户登录 → 服务器生成 JWT → 返回给客户端
 * 2. 客户端保存 JWT（通常存在 localStorage 或 Cookie）
 * 3. 客户端后续请求 → 在 Header 中携带 JWT
 * 4. 服务器验证 JWT → 通过则放行，否则返回401
 *
 * 【配置说明】
 * 在 application.yml 中配置：
 *   jwt:
 *     secret: your_secret_key    # 签名密钥，建议32位以上随机字符串
 *     expire-ms: 86400000        # 过期时间，默认24小时（毫秒）
 * ============================================
 */
@Component
public class JwtUtils {

    /**
     * 签名密钥（从配置文件读取）
     * 如果配置文件没有设置，默认值为 "change_me"（生产环境必须修改）
     */
    @Value("${jwt.secret:change_me}")
    private String secret;

    /**
     * Token 过期时间（毫秒）
     * 默认 86400000 毫秒 = 24小时
     * 到期后用户需要重新登录
     */
    @Value("${jwt.expire-ms:86400000}")
    private long expireMs;

    /**
     * 签名密钥对象（由 secret 字符串生成）
     * SecretKey 是 JJWT 库的密钥格式，比原始字符串更安全
     */
    private SecretKey key;

    /**
     * 初始化方法（Spring 创建 Bean 后自动执行）
     *
     * 【@PostConstruct 是什么？】
     * 这个注解表示"Bean 创建完成后立即执行"。
     * 因为 @Value 注入是在构造函数之后才完成的，
     * 所以必须在 @PostConstruct 方法里用 secret 初始化 key，
     * 而不能在构造函数里做。
     */
    @PostConstruct
    public void init() {
        // 将字符串密钥转换为 HMAC-SHA 密钥对象
        // hmacShaKeyFor 会验证密钥长度是否满足 HS256 的要求（至少32字节）
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    /**
     * 生成 JWT Token
     *
     * 【生成流程】
     * 1. 记录当前时间（签发时间）
     * 2. 计算过期时间（当前时间 + expireMs）
     * 3. 用 JJWT 构建 JWT，写入用户ID、时间信息
     * 4. 用密钥签名，生成最终 Token 字符串
     *
     * @param userId 用户ID（存入 JWT 的 subject 字段）
     * @return JWT 字符串，格式：xxx.yyy.zzz
     */
    public String generateToken(Long userId) {
        Date now = new Date();                              // 当前时间（签发时间）
        Date exp = new Date(now.getTime() + expireMs);     // 过期时间

        return Jwts.builder()
                .setSubject(String.valueOf(userId))         // 将 userId 存入 subject 字段
                .setIssuedAt(now)                           // 签发时间
                .setExpiration(exp)                         // 过期时间
                .signWith(key, SignatureAlgorithm.HS256)    // 使用 HS256 算法签名
                .compact();                                  // 生成最终字符串
    }

    /**
     * 解析 JWT Token
     *
     * 【解析流程】
     * 1. 用密钥验证签名是否合法
     * 2. 检查 Token 是否过期
     * 3. 解析出 Payload 中的内容（Claims）
     *
     * 【Claims 是什么？】
     * Claims 是 JWT Payload 部分的内容，类似一个 Map。
     * 通过 claims.getSubject() 可以取出 userId。
     *
     * 【注意】
     * 如果 Token 无效或已过期，会抛出异常。
     * 调用方（JwtAuthFilter）需要捕获异常并返回 401。
     *
     * @param token JWT 字符串
     * @return Claims 对象，包含 userId 等信息
     */
    public Claims parse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)             // 设置验证签名用的密钥
                .build()
                .parseClaimsJws(token)          // 解析 Token（同时验证签名和过期时间）
                .getBody();                      // 返回 Payload 部分（Claims）
    }
}
