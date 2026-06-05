package com.gym.ai.model;

import dev.langchain4j.community.model.dashscope.QwenChatModel;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.listener.ChatModelListener;
import jakarta.annotation.Resource;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConfigurationProperties("langchain4j.community.dashscope.chat-model")
@Data
public class QwenChatModelConfig {

    private String apiKey;
    private String modelName;
    private Float temperature;
    private Integer maxTokens;
    private Double topP;
    private Integer topK;
    private Boolean enableSearch;
    private Integer seed;
    private Float repetitionPenalty;

    @Resource
    private ChatModelListener chatModelListener;

    @Bean("MyQwenChatModel")
    public ChatModel myQwenChatModel() {
        QwenChatModel.QwenChatModelBuilder builder = QwenChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .listeners(List.of(chatModelListener));
        if (temperature != null) {
            builder.temperature(temperature);
        }
        if (maxTokens != null) {
            builder.maxTokens(maxTokens);
        }
        if (topP != null) {
            builder.topP(topP);
        }
        if (topK != null) {
            builder.topK(topK);
        }
        if (enableSearch != null) {
            builder.enableSearch(enableSearch);
        }
        if (seed != null) {
            builder.seed(seed);
        }
        if (repetitionPenalty != null) {
            builder.repetitionPenalty(repetitionPenalty);
        }
        return builder.build();
    }
}
