package com.prabh.splitwise.expense.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomSplitRequest extends ExpenseRequest {
    @NotEmpty(message = "participant shares cannot be empty")
    @Valid
    private List<ParticipantShare> participantShares;
}
