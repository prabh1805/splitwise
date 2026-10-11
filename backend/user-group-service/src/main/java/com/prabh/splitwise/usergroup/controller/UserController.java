package com.prabh.splitwise.usergroup.controller;

import com.prabh.splitwise.usergroup.dto.UserResponse;
import com.prabh.splitwise.usergroup.dto.UserSummary;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt()));
    }

    // Names for ids shown elsewhere (balances, expenses). Only the caller and people sharing a group with them.
    @GetMapping
    public ResponseEntity<List<UserSummary>> lookup(@AuthenticationPrincipal Long userId, @RequestParam List<Long> ids) {
        return ResponseEntity.ok(userService.lookupVisibleUsers(userId, ids));
    }
}
