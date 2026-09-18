package com.prabh.splitwise.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class ParticipantShare {
    private Long userId;
    private BigDecimal shareAmount;

}
