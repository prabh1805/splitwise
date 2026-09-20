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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPoller {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final OutboxRepository outboxRepository;

    @Value("${outbox.poller.batch-size}")
    private int batchSize;

    @Value("${outbox.poller.sort-direction}")
    private String sortDirection;

    private static final String OUTBOX_TOPIC = "expense-created";

    @Scheduled(fixedDelay = 5000)
    public void poll() {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), "createdAt");
        Pageable pageable = PageRequest.of(0, batchSize, sort);
        List<Outbox> pendingOutboxList = outboxRepository.findByStatus(OutboxStatus.PENDING, pageable);

        for(Outbox outbox : pendingOutboxList) {
            kafkaTemplate.send(OUTBOX_TOPIC, String.valueOf(outbox.getAggregateId()), outbox.getPayload())
                    .whenComplete((res, ex) ->{
                        if(ex == null) {
                            outbox.setStatus(OutboxStatus.PUBLISHED);
                            outbox.setPublishedAt(Instant.now());
                            outboxRepository.save(outbox);
                        }else{
                            log.error("Failed to publish outbox id={} for expense id={}", outbox.getId(), outbox.getAggregateId());
                        }
                    });
        }
    }
}
