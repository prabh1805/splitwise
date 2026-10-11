package com.prabh.splitwise.expense.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.prabh.splitwise.expense.dto.ExpenseRequest;
import com.prabh.splitwise.expense.dto.ExpenseResponse;
import com.prabh.splitwise.expense.entity.Expense;
import com.prabh.splitwise.expense.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
public class ExpenseController {
    private final ExpenseService expenseService;

    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(@AuthenticationPrincipal Long userId,
                                                         @Valid @RequestBody ExpenseRequest expenseRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.createExpense(expenseRequest, userId));
    }

    // Expenses outside any group between the caller and one other person, newest first
    @GetMapping("/direct")
    public ResponseEntity<Page<ExpenseResponse>> getDirectExpenses(
            @AuthenticationPrincipal Long userId,
            @RequestParam("with") Long otherUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(expenseService.getDirectExpenses(userId, otherUserId, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponse> getExpense(@PathVariable Long id) {
        return ResponseEntity.ok(expenseService.getExpenseById(id));
    }

    @GetMapping
    public ResponseEntity<Page<ExpenseResponse>> getExpensesByGroup(
            @RequestParam Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {
        return ResponseEntity.ok(expenseService.getExpenseByGroup(groupId, page, size, sortBy, sortDirection));
    }
}
