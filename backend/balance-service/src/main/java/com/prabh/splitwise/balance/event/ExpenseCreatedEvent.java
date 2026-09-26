package com.prabh.splitwise.balance.event;


import java.math.BigDecimal;
import java.util.List;



public record ExpenseCreatedEvent (
        String eventId,
        Long expenseId,
        Long groupId,
        Long paidBy,
        BigDecimal totalAmount,
        List<ShareInfo> shares
){

}
