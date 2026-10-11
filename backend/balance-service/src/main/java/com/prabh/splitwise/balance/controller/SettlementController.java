package com.prabh.splitwise.balance.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.List;
import com.prabh.splitwise.balance.dto.request.CreateSettlementRequest;
import com.prabh.splitwise.balance.dto.response.SettlementResponse;
import com.prabh.splitwise.balance.entity.Settlement;
import com.prabh.splitwise.balance.service.SettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @PostMapping
    public ResponseEntity<SettlementResponse> create(@AuthenticationPrincipal Long userId,
                                                     @Valid @RequestBody CreateSettlementRequest request) {
        Settlement settlement = settlementService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(settlement));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<SettlementResponse> acknowledge(@PathVariable Long id,
                                                          @AuthenticationPrincipal Long userId) {
        Settlement settlement = settlementService.acknowledge(id, userId);
        return ResponseEntity.ok(toResponse(settlement));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<SettlementResponse> reject(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        Settlement settlement = settlementService.reject(id, userId);
        return ResponseEntity.ok(toResponse(settlement));
    }

    @GetMapping
    public ResponseEntity<List<SettlementResponse>> listForUser(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(settlementService.listForUser(userId).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SettlementResponse> get(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(toResponse(settlementService.get(id, userId)));
    }


    private SettlementResponse toResponse(Settlement settlement) {
        return new SettlementResponse(
                settlement.getId(),
                settlement.getPayerId(),
                settlement.getReceiverId(),
                settlement.getGroupId(),
                settlement.getAmount(),
                settlement.getStatus(),
                settlement.getCreatedAt()
                ,settlement.getStatusChangedAt()
        );
    }
}