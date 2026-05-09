package com.gym.controller;

import com.gym.common.ErrorCode;
import com.gym.common.exception.BizException;
import org.springframework.security.core.Authentication;

/**
 * Shared helpers for controllers that require a logged-in user.
 */
public abstract class BaseAuthenticatedController {

    protected Long requireUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "登录已失效，请重新登录");
        }
        return (Long) authentication.getPrincipal();
    }
}
