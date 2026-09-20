package com.prabh.splitwise.expense.exception;

import lombok.*;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationErrorResponse {
    private int status;
    private String message;
    private Instant timestamp;
    Map<String, String> fieldErrors;
}
