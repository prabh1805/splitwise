package com.prabh.splitwise.expense.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class ParticipantShare {
    @NotNull(message = "user Id cannot be null")
    private Long userId;

    @NotNull(message = "share amount cannot be null.")
    @Positive(message = "share amount must be greater then zero.")
    private BigDecimal shareAmount;

}
