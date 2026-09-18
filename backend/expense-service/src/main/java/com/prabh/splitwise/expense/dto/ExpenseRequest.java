package com.prabh.splitwise.expense.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.prabh.splitwise.expense.enums.SplitType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "splitType"
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = EqualSplitRequest.class, name = "EQUAL"),
        @JsonSubTypes.Type(value = CustomSplitRequest.class, name = "CUSTOM")
})
@Getter
@Setter
@NoArgsConstructor
public abstract class ExpenseRequest {
    private Long groupId;
    private Long paidBy;
    private BigDecimal totalAmount;
    private SplitType splitType;
}