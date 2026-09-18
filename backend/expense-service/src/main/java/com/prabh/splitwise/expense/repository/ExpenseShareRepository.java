package com.prabh.splitwise.expense.repository;

import com.prabh.splitwise.expense.entity.ExpenseShare;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseShareRepository extends JpaRepository<ExpenseShare, Long> {
}
