package com.gym.service;

import com.gym.entity.TrainRecord;

import java.time.LocalDate;
import java.util.List;

public interface TrainingService {
    void reportProgress(Long userId, Long groupId, LocalDate date, int done, int target, Long challengeId);

    void startTraining(Long userId, Long groupId);

    void abandonTraining(Long userId, Long groupId, LocalDate date);
    
    List<TrainRecord> getTodayTraining(Long userId);

    int getTodoCount(Long userId);
}



