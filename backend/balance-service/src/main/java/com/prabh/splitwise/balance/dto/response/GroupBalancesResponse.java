package com.prabh.splitwise.balance.dto.response;

import java.util.List;

public record GroupBalancesResponse(Long groupId, List<GroupBalanceResponse> balances) {
}