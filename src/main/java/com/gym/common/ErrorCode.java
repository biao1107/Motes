package com.gym.common;

import lombok.Getter;

/**
 * 错误码枚举
 */
@Getter
public enum ErrorCode {
    /**
     * 成功
     */
    SUCCESS(0, "success"),

    /**
     * 客户端错误
     */
    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未授权"),
    FORBIDDEN(403, "禁止访问"),
    NOT_FOUND(404, "资源不存在"),

    /**
     * 服务端错误
     */
    INTERNAL_ERROR(500, "服务器内部错误"),

    /**
     * 业务相关错误
     */
    USER_EXISTS(10001, "用户已存在"),
    USER_NOT_FOUND(10002, "用户不存在"),
    PASSWORD_ERROR(10003, "密码错误"),
    VERIFY_CODE_ERROR(10004, "验证码错误"),
    GROUP_FULL(10005, "小组人数已满"),
    ALREADY_JOINED(10006, "已加入该小组");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public static ErrorCode fromCode(int code) {
        for (ErrorCode errorCode : values()) {
            if (errorCode.code == code) {
                return errorCode;
            }
        }
        return INTERNAL_ERROR;
    }
}