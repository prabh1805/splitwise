package com.prabh.splitwise.balance.repository;

import com.prabh.splitwise.balance.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.prabh.splitwise.balance.projection.PairBalance;

import java.util.List;

public interface LedgerRepository extends JpaRepository<LedgerEntry, Long> {

    @Query(
        """
            Select l.debtorId As debtorId, l.creditorId As creditorId, SUM(l.amount) AS total
            FROM LedgerEntry l
            WHERE l.groupId =:groupId
            GROUP BY l.debtorId, l.creditorId
        """
    )
    List<PairBalance> findPairBalancesByGroupId(@Param("groupId") Long groupId);

    @Query(
        """
            SELECT l.debtorId AS debtorId, l.creditorId AS creditorId, SUM(l.amount) AS amount
            FROM LedgerEntry l
            WHERE l.debtorId = :userId OR l.creditorId = :userId
            GROUP BY l.debtorId, l.creditorId
        """
    )
    List<PairBalance> findPairBalancesByUserId(@Param("userId") Long userId);
}
