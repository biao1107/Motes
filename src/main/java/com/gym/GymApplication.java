package com.gym;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ============================================
 * Gym 健身搭子后端应用 - 入口类
 * ============================================
 * 作用：
 * 1. Spring Boot 应用的启动入口
 * 2. 应用配置和组件扫描
 * 
 * 注解说明：
 * @SpringBootApplication - Spring Boot 主注解，包含：
 *   - @Configuration: 声明为配置类
 *   - @EnableAutoConfiguration: 启用自动配置
 *   - @ComponentScan: 扫描当前包及子包的组件
 * 
 * @MapperScan - MyBatis Mapper 扫描
 *   - 扫描 com.gym.mapper 包下所有 Mapper 接口
 *   - 自动生成实现类，不需要手动编写
 * 
 * @EnableScheduling - 启用定时任务
 *   - 用于执行定时任务（如更新挑战状态）
 * 
 * 启动方式：
 * 1. IDE：直接运行 main 方法
 * 2. Maven：mvn spring-boot:run
 * 3. JAR：java -jar target/gym-0.0.1-SNAPSHOT.jar
 * ============================================
 */
@SpringBootApplication
@MapperScan("com.gym.mapper")
@EnableScheduling
public class GymApplication {

    /**
     * 应用启动入口方法
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(GymApplication.class, args);
        System.out.println("\n===========================================" +
                "\n🏋️ Gym 健身搭子后端服务已启动" +
                "\n🚀 API 接口地址: http://localhost:8080" +
                "\n📚 Swagger 文档: http://localhost:8080/swagger-ui.html" +
                "\n===========================================\n");
    }
}



