package com.prabh.splitwise.expense.repository;

import com.prabh.splitwise.expense.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    Page<Expense> findByGroupId(Long groupId, Pageable pageable);

    // Non-group expenses where both users took part, either as payer or with a share
    @Query(value = DIRECT_BETWEEN, countQuery = "SELECT COUNT(e) " + DIRECT_BETWEEN_FROM)
    Page<Expense> findDirectBetween(@Param("a") Long a, @Param("b") Long b, Pageable pageable);

    String DIRECT_BETWEEN_FROM = """
            FROM Expense e
            WHERE e.groupId IS NULL
              AND (e.paidBy = :a OR EXISTS (SELECT 1 FROM ExpenseShare s WHERE s.expense = e AND s.userId = :a))
              AND (e.paidBy = :b OR EXISTS (SELECT 1 FROM ExpenseShare s WHERE s.expense = e AND s.userId = :b))
            """;
    String DIRECT_BETWEEN = "SELECT e " + DIRECT_BETWEEN_FROM;
}
