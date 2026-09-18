package com.prabh.splitwise.expense.event;

import lombok.*;

import java.math.BigDecimal;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class ShareInfo {
    private Long userId;
    private BigDecimal shareAmount;
}
