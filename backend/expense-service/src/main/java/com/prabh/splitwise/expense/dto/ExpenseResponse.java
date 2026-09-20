package com.prabh.splitwise.expense.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {
    private Long id;
    private Long groupId;
    private Long paidBy;
    private BigDecimal totalAmount;
    private List<ShareResponse> shares;
    private Instant createdAt;
}