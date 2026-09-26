package com.prabh.splitwise.balance.service;

import com.prabh.splitwise.balance.dto.GroupBalance;
import com.prabh.splitwise.balance.dto.UserBalance;
import com.prabh.splitwise.balance.entity.LedgerEntry;
import com.prabh.splitwise.balance.enums.SourceType;
import com.prabh.splitwise.balance.event.ExpenseCreatedEvent;
import com.prabh.splitwise.balance.event.ShareInfo;
import com.prabh.splitwise.balance.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.util.Pair;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.prabh.splitwise.balance.projection.PairBalance;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LedgerService {

    private final LedgerRepository ledgerRepository;

    @Transactional
    public void createLedgerFromExpenseCreatedEvent(ExpenseCreatedEvent event) {
        // Fail fast: a malformed event can never succeed, so skip it instead of
        // letting it fail through the listener's retries
        if (event.eventId() == null || event.expenseId() == null
                || event.paidBy() == null || event.shares() == null) {
            log.warn("Skipping malformed EXPENSE_CREATED for expense {}: required field missing ({})",
                    event.expenseId(), event);
            return;
        }

        List<LedgerEntry> ledgerEntryList = new ArrayList<>();

        for (ShareInfo shareInfo : event.shares()) {
            if (shareInfo.userId().equals(event.paidBy())) {
                continue;   // payer doesn't owe themselves
            }
            ledgerEntryList.add(LedgerEntry.builder()
                    .eventId(event.eventId())
                    .debtorId(shareInfo.userId())
                    .creditorId(event.paidBy())
                    .amount(shareInfo.shareAmount())
                    .sourceType(SourceType.EXPENSE)
                    .sourceId(event.expenseId())
                    .groupId(event.groupId())
                    .build());
        }

        createLedger(ledgerEntryList);
    }

    @Transactional(readOnly = true)
    public List<GroupBalance> getGroupBalances(Long groupId) {
        List<PairBalance> pairBalances = ledgerRepository.findPairBalancesByGroupId(groupId);
        return netPairs(pairBalances);
    }

    @Transactional(readOnly = true)
    public List<UserBalance> getUserBalances(Long userId) {
        List<PairBalance> pairBalances = ledgerRepository.findPairBalancesByUserId(userId);
        List<GroupBalance> groupBalances = netPairs(pairBalances);
        List<UserBalance> userBalances = new ArrayList<>();
        for (GroupBalance groupBalance : groupBalances) {
            if(groupBalance.creditorId().equals(userId)) {
                userBalances.add(new UserBalance(groupBalance.debtorId(), groupBalance.amount(), false));
            }else{
                userBalances.add(new UserBalance(groupBalance.creditorId(), groupBalance.amount(), true));
            }
        }
        return userBalances;
    }

    private List<GroupBalance> netPairs(List<PairBalance> pairBalances) {
        Map<Pair<Long, Long>, BigDecimal> mp = new HashMap<>();
        for(PairBalance pairBalance : pairBalances) {
            Long debtorId = pairBalance.debtorId();
            Long creditorId = pairBalance.creditorId();
            BigDecimal amount = pairBalance.amount();
            mp.put(Pair.of(debtorId, creditorId), amount);
        }

        List<GroupBalance> groupBalances = new ArrayList<>();

        for(Pair<Long, Long> key : mp.keySet()) {
            Pair<Long, Long> complement = Pair.of(key.getSecond(),  key.getFirst());
            if(!mp.containsKey(complement)) {
                groupBalances.add(new GroupBalance(key.getFirst(), key.getSecond(), mp.get(key)));
            }else{
                BigDecimal amountA = mp.get(key);
                BigDecimal amountB = mp.get(complement);

                BigDecimal diff = amountA.subtract(amountB);
                if(diff.compareTo(BigDecimal.ZERO) > 0) {
                    groupBalances.add(new GroupBalance(key.getFirst(), key.getSecond(), diff));
                }
            }
        }
        return groupBalances;
    }

    @Transactional
    public List<LedgerEntry> createLedger(List<LedgerEntry> entries) {
        return ledgerRepository.saveAll(entries);
    }

    @Transactional
    public LedgerEntry createLedger(LedgerEntry entry) {
        return ledgerRepository.save(entry);
    }
}