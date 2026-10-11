package com.prabh.splitwise.usergroup.dto;

import java.time.Instant;

public record MemberResponse(Long id, String name, String email, Instant joinedAt) {
}
