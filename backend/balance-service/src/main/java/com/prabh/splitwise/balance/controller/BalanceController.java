package com.prabh.splitwise.balance.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;
import com.prabh.splitwise.balance.dto.GroupBalance;
import com.prabh.splitwise.balance.dto.UserBalance;
import com.prabh.splitwise.balance.dto.response.GroupBalanceResponse;
import com.prabh.splitwise.balance.dto.response.GroupBalancesResponse;
import com.prabh.splitwise.balance.dto.response.UserBalanceResponse;
import com.prabh.splitwise.balance.dto.response.UserBalancesResponse;
import com.prabh.splitwise.balance.service.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/balances")
@RequiredArgsConstructor
public class BalanceController {

    private final LedgerService ledgerService;

    @GetMapping
    public ResponseEntity<GroupBalancesResponse> getGroupBalances(@RequestParam Long groupId) {
        List<GroupBalance> balances = ledgerService.getGroupBalances(groupId);

        List<GroupBalanceResponse> body = balances.stream()
                .map(b -> new GroupBalanceResponse(b.debtorId(), b.creditorId(), b.amount()))
                .toList();

        return ResponseEntity.ok(new GroupBalancesResponse(groupId, body));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<UserBalancesResponse> getUserBalances(@PathVariable Long userId,
                                                                @AuthenticationPrincipal Long callerId) {
        if (!userId.equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only see your own balances");
        }
        List<UserBalance> balances = ledgerService.getUserBalances(userId);

        List<UserBalanceResponse> body = balances.stream()
                .map(b -> new UserBalanceResponse(b.otherUserId(), b.amount(), b.youOwe()))
                .toList();

        return ResponseEntity.ok(new UserBalancesResponse(userId, body));
    }
}