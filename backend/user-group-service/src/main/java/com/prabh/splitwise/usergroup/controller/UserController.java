package com.prabh.splitwise.usergroup.controller;

import com.prabh.splitwise.usergroup.dto.RegisterRequest;
import com.prabh.splitwise.usergroup.dto.UserResponse;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<String> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok("logged in as id " + user.getId() + ", " + user.getEmail());
    }
}
