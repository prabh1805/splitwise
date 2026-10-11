package com.prabh.splitwise.balance.service;

import java.util.List;
import com.prabh.splitwise.balance.dto.request.CreateSettlementRequest;

import com.prabh.splitwise.balance.entity.LedgerEntry;
import com.prabh.splitwise.balance.entity.Settlement;
import com.prabh.splitwise.balance.enums.SettlementStatus;
import com.prabh.splitwise.balance.enums.SourceType;

import com.prabh.splitwise.balance.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;


@Service
@RequiredArgsConstructor
public class SettlementService {
    private final SettlementRepository settlementRepository;
    private final LedgerService ledgerService;


    @Transactional
    // Only the payer can record a payment; the receiver then acknowledges or rejects it
    public Settlement create(CreateSettlementRequest request, Long callerId) {
        if (!request.getPayerId().equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only record payments you made");
        }
        if (request.getPayerId().equals(request.getReceiverId())) {
            throw new IllegalArgumentException("payerId and receiverId must be different");
        }

        Settlement settlement = Settlement.builder()
                .idempotencyKey(request.getIdempotencyKey())
                .payerId(request.getPayerId())
                .receiverId(request.getReceiverId())
                .groupId(request.getGroupId())
                .amount(request.getAmount())
                .status(SettlementStatus.PENDING)
                .statusChangedAt(Instant.now())
                .build();

        try {
            return settlementRepository.save(settlement);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Settlement already exists for idempotencyKey " + request.getIdempotencyKey());
        }
    }

    @Transactional
    public Settlement acknowledge(Long id, Long userId) {
        Settlement settlement = settlementRepository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Settlement not found for id: " + id)
        );
        if (!settlement.getReceiverId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the receiver can acknowledge this settlement");
        }

        if (settlement.getStatus() != SettlementStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Settlement " + id + " is already " + settlement.getStatus());
        }
        settlement.setStatus(SettlementStatus.ACKNOWLEDGED);
        settlement.setStatusChangedAt(Instant.now());
        settlementRepository.save(settlement);

        LedgerEntry ledgerEntry = LedgerEntry.builder()
                .groupId(settlement.getGroupId())
                .sourceType(SourceType.SETTLEMENT)
                .debtorId(settlement.getReceiverId())
                .creditorId(settlement.getPayerId())
                .amount(settlement.getAmount())
                .eventId(settlement.getIdempotencyKey())
                .sourceId(settlement.getId())
                .build();

        ledgerService.createLedger(ledgerEntry);

        return settlementRepository.save(settlement);
    }

    @Transactional
    public Settlement reject(Long id, Long userId) {
        Settlement settlement = settlementRepository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Settlement not found for id: " + id)
        );
        if (!settlement.getReceiverId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the receiver can reject this settlement");
        }

        if (settlement.getStatus() != SettlementStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Settlement " + id + " is already " + settlement.getStatus());
        }
        settlement.setStatus(SettlementStatus.REJECTED);
        settlement.setStatusChangedAt(Instant.now());
        return settlementRepository.save(settlement);
    }

    @Transactional(readOnly = true)
    // Latest settlements the user paid or received, newest first
    public List<Settlement> listForUser(Long userId) {
        return settlementRepository.findTop50ByPayerIdOrReceiverIdOrderByCreatedAtDesc(userId, userId);
    }

    // Only the payer and receiver can see a settlement; anyone else gets the same 404 as a missing one
    public Settlement get(Long id, Long callerId) {
        Settlement settlement = settlementRepository.findById(id)
                .filter(s -> s.getPayerId().equals(callerId) || s.getReceiverId().equals(callerId))
                .orElse(null);
        if (settlement == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Settlement not found for id: " + id);
        }
        return settlement;
    }
}
