package com.prabh.splitwise.balance.event;

import java.math.BigDecimal;


public record ShareInfo (
        Long userId,
        BigDecimal shareAmount
){

}
