package com.prabh.splitwise.usergroup.controller;

import com.prabh.splitwise.usergroup.dto.AddMemberRequest;
import com.prabh.splitwise.usergroup.dto.UserSummary;
import com.prabh.splitwise.usergroup.service.FriendService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/friends")
@RequiredArgsConstructor
public class FriendController {
    private final FriendService friendService;

    @GetMapping
    public ResponseEntity<List<UserSummary>> list(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(friendService.list(userId));
    }

    @PostMapping
    public ResponseEntity<UserSummary> add(@AuthenticationPrincipal Long userId, @Valid @RequestBody AddMemberRequest request) {
        return ResponseEntity.ok(friendService.addByEmail(userId, request.email()));
    }
}
