package com.prabh.splitwise.expense.controller;

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
    public ResponseEntity<ExpenseResponse> createExpense(@Valid @RequestBody ExpenseRequest expenseRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.createExpense(expenseRequest));
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
