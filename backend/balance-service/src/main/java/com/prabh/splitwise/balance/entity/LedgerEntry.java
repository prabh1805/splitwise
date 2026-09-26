package com.prabh.splitwise.balance.entity;

import com.prabh.splitwise.balance.enums.SourceType;
import jakarta.persistence.*;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;


import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Getter
@Immutable
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"eventId", "debtor_id"}))
public class LedgerEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    private Long groupId;

    @Column(nullable = false, length = 36)
    private String eventId;

    @Column(nullable = false)
    private Long debtorId;

    @Column(nullable = false)
    private Long  creditorId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private SourceType sourceType;

    @Column(nullable = false)
    private Long sourceId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

}
