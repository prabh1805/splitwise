package com.prabh.splitwise.expense.controller;

import com.prabh.splitwise.expense.dto.ExpenseRequest;
import com.prabh.splitwise.expense.entity.Expense;
import com.prabh.splitwise.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
public class ExpenseController {
    private final ExpenseService expenseService;

    @PostMapping
    public ResponseEntity<Expense> createExpense(@RequestBody ExpenseRequest expenseRequest) {
        return null;
    }
}
