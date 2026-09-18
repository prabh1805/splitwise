package com.prabh.splitwise.expense.dto;

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
    private List<ParticipantShare> participantShares;
}
