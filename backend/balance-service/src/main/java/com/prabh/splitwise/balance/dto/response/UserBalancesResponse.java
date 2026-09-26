package com.prabh.splitwise.balance.dto.response;

import java.util.List;

public record UserBalancesResponse(Long userId, List<UserBalanceResponse> balances) {
}