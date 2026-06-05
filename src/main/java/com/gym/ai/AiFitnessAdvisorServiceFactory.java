package com.gym.ai;

import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.service.AiServices;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiFitnessAdvisorServiceFactory {

    @Resource(name = "MyQwenChatModel")
    private ChatModel myQwenChatModel;

    @Resource(name = "qwenStreamingChatModel")
    private StreamingChatModel qwenStreamingChatModel;

    @Bean
    public AiFitnessAdvisorService aiFitnessAdvisorService() {
        return AiServices.builder(AiFitnessAdvisorService.class)
                .chatModel(myQwenChatModel)
                .streamingChatModel(qwenStreamingChatModel)
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.withMaxMessages(10))
                .build();
    }
}
