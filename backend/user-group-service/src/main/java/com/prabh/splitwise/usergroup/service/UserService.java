package com.prabh.splitwise.usergroup.service;

import com.prabh.splitwise.usergroup.dto.RegisterRequest;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.repository.UserRepository;
import com.prabh.splitwise.usergroup.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;


@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;


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

}
