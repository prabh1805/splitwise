package com.prabh.splitwise.usergroup.service;

import com.prabh.splitwise.usergroup.dto.RegisterRequest;
import com.prabh.splitwise.usergroup.dto.UserSummary;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.repository.FriendshipRepository;
import com.prabh.splitwise.usergroup.repository.MembershipRepository;
import com.prabh.splitwise.usergroup.repository.UserRepository;
import com.prabh.splitwise.usergroup.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;


@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MembershipRepository membershipRepository;
    private final FriendshipRepository friendshipRepository;

    private static final int MAX_LOOKUP = 100;


    @Transactional
    public User createUser(RegisterRequest registerRequest) {
        String email = EmailNormalizer.normalize(registerRequest.email());
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        User user = User.builder()
                .hashedPassword(getHashedPassword(registerRequest.password()))
                .email(email)
                .name(registerRequest.name())
                .build();
        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException e) {       // lost the race: same email inserted concurrently
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
    }

    public Optional<User> findUserByEmail(String email) {
        email = EmailNormalizer.normalize(email);
        return userRepository.findByEmail(email);
    }

    private String getHashedPassword(String password) {
        return passwordEncoder.encode(password);
    }

    @Transactional(readOnly = true)
    public List<UserSummary> lookupVisibleUsers(Long userId, List<Long> ids) {
        if (ids.size() > MAX_LOOKUP) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At most " + MAX_LOOKUP + " ids per request");
        }
        Set<Long> wanted = new HashSet<>(ids);
        Map<Long, User> users = new LinkedHashMap<>();
        membershipRepository.findUsersSharingAGroup(userId, wanted).forEach(u -> users.put(u.getId(), u));
        friendshipRepository.findFriendsAmong(userId, wanted).forEach(u -> users.putIfAbsent(u.getId(), u));
        if (wanted.contains(userId)) {
            users.computeIfAbsent(userId, this::getUserById);
        }
        return users.values().stream().map(u -> new UserSummary(u.getId(), u.getName(), u.getEmail())).toList();
    }

    public User getUserById(Long id){
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

}
