package com.prabh.splitwise.usergroup.controller;

import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    @GetMapping("/me")
    public ResponseEntity<String> me(@AuthenticationPrincipal Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok("logged in as id " + user.getId() + ", " + user.getEmail());
    }
}
