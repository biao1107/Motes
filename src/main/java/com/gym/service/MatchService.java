package com.gym.service;

import com.gym.dto.MatchResult;
import java.util.List;

public interface MatchService {
    List<Long> matchTopCandidates(Long userId, int limit);
}




