package com.gym.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * ============================================
 * Swagger/OpenAPI 配置类
 * ============================================
 *
 * 【什么是 Swagger/OpenAPI？】
 * Swagger 是一个 API 文档生成工具，现在称为 OpenAPI Specification（OAS）。
 * 它可以根据代码中的注解自动生成可交互的 API 文档页面。
 *
 * 【作用】
 * 1. 自动生成 API 文档，无需手动维护
 * 2. 提供在线调试界面（Swagger UI），可以直接在浏览器里测试接口
 * 3. 前后端协作时，前端可以直观看到所有接口定义
 *
 * 【访问方式】
 * 启动项目后访问：http://localhost:8080/swagger-ui.html
 * 可以看到所有 Controller 接口，并直接发送测试请求。
 *
 * 【与 SpringDoc 的关系】
 * 本项目使用 springdoc-openapi 库（Swagger 的 Spring 生态实现）。
 * 只需在 pom.xml 引入依赖，无需额外注解，它会自动扫描所有 @RestController。
 *
 * 【本类的作用】
 * 配置 OpenAPI 的基本信息（标题、描述、版本等），
 * 这些信息会显示在 Swagger UI 页面顶部。
 * ============================================
 */
@Configuration
public class SwaggerConfig {

    /**
     * 创建 OpenAPI 配置对象
     *
     * 【配置内容】
     * - title：API 文档标题
     * - description：API 文档描述
     * - version：API 版本号
     * - externalDocs：外部文档链接（如项目 README）
     *
     * @return 配置好的 OpenAPI 对象
     */
    @Bean
    public OpenAPI gymOpenAPI() {
        return new OpenAPI()
                // 配置 API 基本信息
                .info(new Info()
                        .title("Gym Buddy API")                           // 文档标题
                        .description("健身搭子匹配与协同训练 API 文档")      // 文档描述
                        .version("v0.1"))                                  // API 版本
                // 配置外部文档链接
                .externalDocs(new ExternalDocumentation()
                        .description("项目说明")                          // 链接描述
                        .url("https://example.com/gym"));                 // 链接地址
    }
}









