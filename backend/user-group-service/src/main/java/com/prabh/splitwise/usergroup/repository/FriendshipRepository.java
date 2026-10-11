package com.prabh.splitwise.usergroup.repository;

import com.prabh.splitwise.usergroup.entity.Friendship;
import com.prabh.splitwise.usergroup.entity.FriendshipId;
import com.prabh.splitwise.usergroup.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface FriendshipRepository extends JpaRepository<Friendship, FriendshipId> {

    @Query("SELECT f.friend FROM Friendship f WHERE f.id.userId = :userId ORDER BY f.friend.name")
    List<User> findFriendsOf(@Param("userId") Long userId);

    @Query("SELECT f.friend FROM Friendship f WHERE f.id.userId = :userId AND f.id.friendId IN :ids")
    List<User> findFriendsAmong(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);
}
