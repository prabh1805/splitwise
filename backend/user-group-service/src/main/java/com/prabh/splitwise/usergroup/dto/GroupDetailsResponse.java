package com.prabh.splitwise.usergroup.dto;

import java.time.Instant;
import java.util.List;

public record GroupDetailsResponse(Long id, String name, Long createdBy, Instant createdAt, List<MemberResponse> members) {
}
