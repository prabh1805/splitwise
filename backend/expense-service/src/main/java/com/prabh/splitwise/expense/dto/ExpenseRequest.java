package com.prabh.splitwise.expense.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.prabh.splitwise.expense.enums.SplitType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "splitType",
        visible = true
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

    @NotNull(message = "paid by cannot be null")
    private Long paidBy;

    @NotNull(message = "total amount cannot be null")
    @Positive(message = "total amount must be greater then zero")
    private BigDecimal totalAmount;

    @NotNull(message = "split type cannot be null")
    private SplitType splitType;
}