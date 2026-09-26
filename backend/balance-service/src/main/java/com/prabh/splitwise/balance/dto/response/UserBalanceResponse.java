package com.prabh.splitwise.balance.dto.response;

import java.math.BigDecimal;

public record UserBalanceResponse(Long otherUserId, BigDecimal amount, boolean youOwe) {
}