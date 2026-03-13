package com.gym.service;

import com.gym.entity.User;

public interface UserService {
    User getProfile(Long userId);

    void updateProfile(User profile);

    String getUserNickname(Long userId);
}








