package com.prabh.splitwise.expense.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShareResponse {
    private Long userId;
    private BigDecimal shareAmount;
}
