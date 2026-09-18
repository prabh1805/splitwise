package com.prabh.splitwise.expense.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EqualSplitRequest extends ExpenseRequest {
    private List<Long> participantUserIds;
}
