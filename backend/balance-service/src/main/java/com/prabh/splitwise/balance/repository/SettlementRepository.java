package com.prabh.splitwise.balance.repository;

import com.prabh.splitwise.balance.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    Optional<Settlement> findByIdempotencyKey(String idempotencyKey);
}
