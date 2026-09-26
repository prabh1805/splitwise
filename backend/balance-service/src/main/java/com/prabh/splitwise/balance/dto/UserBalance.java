package com.prabh.splitwise.balance.dto;

import java.math.BigDecimal;

public record UserBalance(Long otherUserId, BigDecimal amount, boolean youOwe) { }