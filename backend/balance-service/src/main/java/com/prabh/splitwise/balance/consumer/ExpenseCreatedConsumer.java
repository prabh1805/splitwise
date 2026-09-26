package com.prabh.splitwise.balance.consumer;

import com.prabh.splitwise.balance.event.ExpenseCreatedEvent;
import com.prabh.splitwise.balance.service.LedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@Slf4j
@RequiredArgsConstructor
public class ExpenseCreatedConsumer {
    private static final String TOPIC = "expense-created";
    private final LedgerService ledgerService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC)
    public void onExpenseCreated(String payload) {
        ExpenseCreatedEvent expenseCreatedEvent = objectMapper.readValue(payload, ExpenseCreatedEvent.class);
        log.info("Expense Created Event: {}", expenseCreatedEvent);
        try {
            ledgerService.createLedgerFromExpenseCreatedEvent(expenseCreatedEvent);
        } catch (DataIntegrityViolationException e) {
            log.info("Event {} already processed, skipping", expenseCreatedEvent.eventId());
        }
    }
}
