package com.prabh.splitwise.expense.repository;

import com.prabh.splitwise.expense.entity.ExpenseShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseShareRepository extends JpaRepository<ExpenseShare, Long> {
    List<ExpenseShare> findByExpense_Id(Long expenseId);

    List<ExpenseShare> findByExpense_IdIn(List<Long> expenseId);
}
