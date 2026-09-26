package com.prabh.splitwise.balance.dto.response;

import com.prabh.splitwise.balance.enums.SettlementStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record SettlementResponse(
        Long id,
        Long payerId,
        Long receiverId,
        Long groupId,
        BigDecimal amount,
        SettlementStatus status,
        Instant createdAt,
        Instant statusChangedAt
) { }