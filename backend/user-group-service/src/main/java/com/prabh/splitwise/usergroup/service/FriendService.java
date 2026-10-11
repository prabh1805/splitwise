package com.prabh.splitwise.usergroup.service;

import com.prabh.splitwise.usergroup.dto.UserSummary;
import com.prabh.splitwise.usergroup.entity.Friendship;
import com.prabh.splitwise.usergroup.entity.FriendshipId;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.repository.FriendshipRepository;
import com.prabh.splitwise.usergroup.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendService {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<UserSummary> list(Long userId) {
        return friendshipRepository.findFriendsOf(userId).stream()
                .map(u -> new UserSummary(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }

    // Adding someone who's already a friend is a no-op, so the call is safe to repeat
    @Transactional
    public UserSummary addByEmail(Long userId, String email) {
        User friend = userService.findUserByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No user has registered with that email"));
        if (friend.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't add yourself as a friend");
        }
        User me = userRepository.getReferenceById(userId);
        link(me, friend);
        link(friend, me);
        return new UserSummary(friend.getId(), friend.getName(), friend.getEmail());
    }

    private void link(User user, User friend) {
        FriendshipId id = new FriendshipId(user.getId(), friend.getId());
        if (!friendshipRepository.existsById(id)) {
            friendshipRepository.save(Friendship.builder().id(id).user(user).friend(friend).build());
        }
    }
}
