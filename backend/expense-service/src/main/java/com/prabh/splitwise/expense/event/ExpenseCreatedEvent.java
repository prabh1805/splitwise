package com.prabh.splitwise.expense.event;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCreatedEvent {
    private String eventId;
    private Long expenseId;
    private Long groupId;
    private Long paidBy;
    private BigDecimal totalAmount;
    private List<ShareInfo> shares;
}
