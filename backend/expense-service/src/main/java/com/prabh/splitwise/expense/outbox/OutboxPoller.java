package com.prabh.splitwise.expense.outbox;

import com.prabh.splitwise.expense.entity.Outbox;
import com.prabh.splitwise.expense.enums.OutboxStatus;
import com.prabh.splitwise.expense.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPoller {

    private static final String OUTBOX_TOPIC = "expense-created";
    private static final long SEND_TIMEOUT_SECONDS = 10;
    private static final int MAX_ATTEMPTS = 5;

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final OutboxRepository outboxRepository;

    @Value("${outbox.poller.batch-size}")
    private int batchSize;

    @Scheduled(fixedDelay = 5000)
    public void poll() {
        Pageable pageable = PageRequest.of(0, batchSize, Sort.by(Sort.Direction.ASC, "createdAt"));
        List<Outbox> pending = outboxRepository.findByStatus(OutboxStatus.PENDING, pageable);
        if (pending.isEmpty()) {
            return;
        }

        // 1. Fire all sends at once
        List<CompletableFuture<SendResult<String, String>>> futures = new ArrayList<>();
        for (Outbox outbox : pending) {
            futures.add(kafkaTemplate.send(
                    OUTBOX_TOPIC, String.valueOf(outbox.getAggregateId()), outbox.getPayload()));
        }

        // 2. Wait for each ack before returning, so the next run can't overlap
        int published = 0;
        for (int i = 0; i < pending.size(); i++) {
            Outbox outbox = pending.get(i);
            try {
                futures.get(i).get(SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                outbox.setStatus(OutboxStatus.PUBLISHED);
                outbox.setPublishedAt(Instant.now());
                outboxRepository.save(outbox);
                published++;
            } catch (ExecutionException e) {
                // Kafka answered and rejected this message: count it against the row
                outbox.setAttemptCount(outbox.getAttemptCount() + 1);
                if (outbox.getAttemptCount() >= MAX_ATTEMPTS) {
                    outbox.setStatus(OutboxStatus.FAILED);
                    log.error("Outbox id={} (expense id={}) marked FAILED after {} attempts, needs manual attention",
                            outbox.getId(), outbox.getAggregateId(), MAX_ATTEMPTS, e.getCause());
                } else {
                    log.warn("Kafka rejected outbox id={} (expense id={}), attempt {}/{}",
                            outbox.getId(), outbox.getAggregateId(), outbox.getAttemptCount(), MAX_ATTEMPTS, e.getCause());
                }
                outboxRepository.save(outbox);
            } catch (TimeoutException e) {
                // No answer at all: Kafka likely unreachable. Not the row's fault, so no attempt counted
                log.warn("No ack within {}s for outbox id={}, stopping batch; remaining rows stay PENDING",
                        SEND_TIMEOUT_SECONDS, outbox.getId());
                break;
            } catch (InterruptedException e) {
                // App is shutting down: restore the flag and stop
                Thread.currentThread().interrupt();
                log.warn("Outbox poller interrupted, stopping");
                return;
            }
        }

        log.info("Outbox poll finished: {} of {} published", published, pending.size());
    }
}