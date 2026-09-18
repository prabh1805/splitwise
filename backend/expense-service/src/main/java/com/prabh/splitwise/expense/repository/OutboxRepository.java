package com.prabh.splitwise.expense.repository;

import com.prabh.splitwise.expense.entity.Outbox;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxRepository extends JpaRepository<Outbox, Long> {
}
