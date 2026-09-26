package com.prabh.splitwise.balance.dto.response;

import java.math.BigDecimal;

public record GroupBalanceResponse(Long debtorId, Long creditorId, BigDecimal amount) {
}