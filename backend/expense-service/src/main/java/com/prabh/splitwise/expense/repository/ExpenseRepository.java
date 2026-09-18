package com.prabh.splitwise.expense.repository;

import com.prabh.splitwise.expense.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
}
