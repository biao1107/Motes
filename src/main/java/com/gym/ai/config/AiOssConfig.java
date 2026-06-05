package com.gym.ai.config;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiOssConfig {

    @Value("${ai.oss.endpoint}")
    private String endpoint;

    @Value("${ai.oss.access-key-id}")
    private String accessKeyId;

    @Value("${ai.oss.access-key-secret}")
    private String accessKeySecret;

    @Bean(destroyMethod = "shutdown")
    public OSS aiOssClient() {
        return new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
    }
}
