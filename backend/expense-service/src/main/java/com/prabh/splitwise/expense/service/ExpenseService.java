package com.prabh.splitwise.expense.service;

import com.prabh.splitwise.expense.dto.CustomSplitRequest;
import com.prabh.splitwise.expense.dto.EqualSplitRequest;
import com.prabh.splitwise.expense.dto.ExpenseRequest;
import com.prabh.splitwise.expense.dto.ParticipantShare;
import com.prabh.splitwise.expense.entity.Expense;
import com.prabh.splitwise.expense.entity.ExpenseShare;
import com.prabh.splitwise.expense.entity.Outbox;
import com.prabh.splitwise.expense.enums.OutboxStatus;
import com.prabh.splitwise.expense.event.ExpenseCreatedEvent;
import com.prabh.splitwise.expense.event.ShareInfo;
import com.prabh.splitwise.expense.repository.ExpenseRepository;
import com.prabh.splitwise.expense.repository.ExpenseShareRepository;
import com.prabh.splitwise.expense.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final ExpenseShareRepository expenseShareRepository;
    private final ObjectMapper objectMapper;
    private final OutboxRepository outboxRepository;

    @Transactional
    public Expense createExpense(ExpenseRequest request) {
        if (request instanceof EqualSplitRequest equalRequest) {
            return createEqualSplitExpense(equalRequest);
        } else if (request instanceof CustomSplitRequest customRequest) {
            return createCustomSplitExpense(customRequest);
        }
        throw new IllegalArgumentException("Unknown split type");
    }

    private Expense createEqualSplitExpense(EqualSplitRequest request) {
        // TODO - Extract Expense and Create And Expense record in DB
        Expense expense = new Expense();
        expense.setGroupId(request.getGroupId());
        expense.setPaidBy(request.getPaidBy());
        expense.setTotalAmount(request.getTotalAmount());

        Expense createdExpense = expenseRepository.save(expense);

        //TODO - Extract equal part and save Expense Share
        List<ExpenseShare> expenseShares = new ArrayList<>();
        List<Long> participantUserIds =  request.getParticipantUserIds();
        int size = participantUserIds.size();

        BigDecimal baseShare = request.getTotalAmount().divide(BigDecimal.valueOf(size), 2, RoundingMode.DOWN);
        BigDecimal leftOver = request.getTotalAmount().subtract(baseShare.multiply(BigDecimal.valueOf(size)));

        BigDecimal leftOverPaise = leftOver.multiply(BigDecimal.valueOf(100));
        int leftOverPaisas =  leftOverPaise.intValue();

        int equalPaisaShare = leftOverPaisas / size;
        int leftOverPiasa = leftOverPaisas % size;

        for(int i = 0; i < size; i++) {
            Long  participantUserId = participantUserIds.get(i);
            BigDecimal share = baseShare.add(BigDecimal.valueOf(equalPaisaShare, 2));
            if (i == 0) {
                share = share.add(BigDecimal.valueOf(leftOverPiasa, 2));
            }
            ExpenseShare expenseShare = new ExpenseShare();
            expenseShare.setShareAmount(share);
            expenseShare.setExpense(createdExpense);
            expenseShare.setUserId(participantUserId);
            expenseShares.add(expenseShare);
        }
        expenseShareRepository.saveAll(expenseShares);
        publishOutbox(createdExpense, expenseShares);
        return createdExpense;
    }

    private Expense createCustomSplitExpense(CustomSplitRequest request) {
        // TODO 0 : Check if total spent amount equals shared amount
        List<ParticipantShare>  participantShareList = request.getParticipantShares();
        BigDecimal participantTotalShare = BigDecimal.ZERO;
        for (ParticipantShare participantShare : participantShareList) {
            participantTotalShare = participantTotalShare.add(participantShare.getShareAmount());
        }
        if(request.getTotalAmount().compareTo(participantTotalShare) != 0) {
            throw new IllegalArgumentException("Total shared amount must be equal to total amount");
        }
        // TODO 1 : Extract  expense from request
        Expense expense = new Expense();
        expense.setGroupId(request.getGroupId());
        expense.setPaidBy(request.getPaidBy());
        expense.setTotalAmount(request.getTotalAmount());

        Expense createdExpense = expenseRepository.save(expense);

        List<ExpenseShare> expenseShares = new ArrayList<>();
        for(ParticipantShare  participantShare : participantShareList) {
            ExpenseShare expenseShare = new ExpenseShare();
            expenseShare.setExpense(createdExpense);
            expenseShare.setShareAmount(participantShare.getShareAmount());
            expenseShare.setUserId(participantShare.getUserId());
            expenseShares.add(expenseShare);
        }
        expenseShareRepository.saveAll(expenseShares);
        publishOutbox(createdExpense, expenseShares);
        return createdExpense;
    }

    private void publishOutbox(Expense expense, List<ExpenseShare> expenseShares) {
        List<ShareInfo> shareInfos = expenseShares.stream()
                .map(x ->
                        ShareInfo.builder()
                                .userId(x.getUserId())
                                .shareAmount(x.getShareAmount())
                                .build()
                ).toList();

        ExpenseCreatedEvent expenseCreatedEvent = ExpenseCreatedEvent.builder()
                .expenseId(expense.getId())
                .groupId(expense.getGroupId())
                .paidBy(expense.getPaidBy())
                .totalAmount(expense.getTotalAmount())
                .shares(shareInfos)
                .build();

        String expenseCreatedJson = objectMapper.writeValueAsString(expenseCreatedEvent);

        Outbox outbox = Outbox.builder()
                .payload(expenseCreatedJson)
                .status(OutboxStatus.PENDING)
                .build();

        outboxRepository.save(outbox);
    }
}
