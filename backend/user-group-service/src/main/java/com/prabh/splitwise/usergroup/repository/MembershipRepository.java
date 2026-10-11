package com.prabh.splitwise.usergroup.repository;

import com.prabh.splitwise.usergroup.dto.GroupMemberCount;
import com.prabh.splitwise.usergroup.entity.Group;
import com.prabh.splitwise.usergroup.entity.Membership;
import com.prabh.splitwise.usergroup.entity.MembershipId;
import com.prabh.splitwise.usergroup.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MembershipRepository extends JpaRepository<Membership, MembershipId> {

    @Query("SELECT m FROM Membership m JOIN FETCH m.user WHERE m.group.id = :groupId ORDER BY m.joinedAt")
    List<Membership> findMembersOfGroup(@Param("groupId") Long groupId);

    @Query("SELECT m.group FROM Membership m WHERE m.user.id = :userId ORDER BY m.group.createdAt DESC")
    List<Group> findGroupsOfUser(@Param("userId") Long userId);

    @Query("SELECT new com.prabh.splitwise.usergroup.dto.GroupMemberCount(m.group.id, COUNT(m)) " +
            "FROM Membership m WHERE m.group.id IN :groupIds GROUP BY m.group.id")
    List<GroupMemberCount> countMembers(@Param("groupIds") Collection<Long> groupIds);

    // Users among `ids` who share at least one group with `userId`
    @Query("SELECT DISTINCT other.user FROM Membership mine JOIN Membership other ON other.group = mine.group " +
            "WHERE mine.user.id = :userId AND other.user.id IN :ids")
    List<User> findUsersSharingAGroup(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM Membership m WHERE m.group.id = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
}
