package com.prabh.splitwise.expense.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EqualSplitRequest extends ExpenseRequest {
    @NotEmpty(message = "participant ids cannot be empty")
    private List<Long> participantUserIds;
}
