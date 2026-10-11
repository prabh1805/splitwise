package com.prabh.splitwise.usergroup.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn) {
}
