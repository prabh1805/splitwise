package com.prabh.splitwise.balance.projection;

import java.math.BigDecimal;

public record PairBalance(Long debtorId, Long creditorId, BigDecimal amount) {
}
