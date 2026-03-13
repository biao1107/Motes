package com.gym.service;

public interface AuthService {
    String login(String phone, String password);

    String loginByCode(String phone, String code);

    Long register(String phone, String password);
}



