package com.gym.ai;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
@Slf4j
public class AiFitnessAdvisor {

    private static final String SYSTEM_PROMPT_RESOURCE = "system-prompt.txt";

    @Resource(name = "MyQwenMultimodalChatModel")
    private ChatModel qwenMultimodalChatModel;

    public String analyzeActionImageByUrl(String prompt, String imageUrl) {
        SystemMessage systemMessage = SystemMessage.from(loadSystemPrompt());
        UserMessage userMessage = UserMessage.from(
                TextContent.from(prompt),
                ImageContent.from(imageUrl)
        );
        ChatResponse chatResponse = qwenMultimodalChatModel.chat(systemMessage, userMessage);
        AiMessage aiMessage = chatResponse.aiMessage();
        log.info("AI action analysis output: {}", aiMessage.text());
        return aiMessage.text();
    }

    private String loadSystemPrompt() {
        try {
            ClassPathResource resource = new ClassPathResource(SYSTEM_PROMPT_RESOURCE);
            byte[] bytes = resource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load AI system prompt: " + SYSTEM_PROMPT_RESOURCE, e);
        }
    }
}
