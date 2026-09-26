package com.prabh.splitwise.balance.dto;

import java.math.BigDecimal;

public record GroupBalance(Long debtorId, Long creditorId, BigDecimal amount) {
}
