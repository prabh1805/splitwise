package com.prabh.splitwise.usergroup.dto;

import java.time.Instant;

public record GroupSummaryResponse(Long id, String name, Long createdBy, long memberCount, Instant createdAt) {
}
