package com.prabh.splitwise.expense.repository;

import com.prabh.splitwise.expense.entity.Outbox;
import com.prabh.splitwise.expense.enums.OutboxStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxRepository extends JpaRepository<Outbox, Long> {
    List<Outbox> findByStatus(OutboxStatus outboxStatus, Pageable pageable);
}
