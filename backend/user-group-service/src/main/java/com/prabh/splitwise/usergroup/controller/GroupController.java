package com.prabh.splitwise.usergroup.controller;

import com.prabh.splitwise.usergroup.dto.AddMemberRequest;
import com.prabh.splitwise.usergroup.dto.GroupDetailsResponse;
import com.prabh.splitwise.usergroup.dto.GroupNameRequest;
import com.prabh.splitwise.usergroup.dto.GroupSummaryResponse;
import com.prabh.splitwise.usergroup.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
public class GroupController {
    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<GroupDetailsResponse> create(@AuthenticationPrincipal Long userId,
                                                       @Valid @RequestBody GroupNameRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.create(userId, request.name()));
    }

    @GetMapping
    public ResponseEntity<List<GroupSummaryResponse>> myGroups(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(groupService.listForUser(userId));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailsResponse> get(@AuthenticationPrincipal Long userId, @PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.get(groupId, userId));
    }

    @PatchMapping("/{groupId}")
    public ResponseEntity<GroupDetailsResponse> rename(@AuthenticationPrincipal Long userId, @PathVariable Long groupId,
                                                       @Valid @RequestBody GroupNameRequest request) {
        return ResponseEntity.ok(groupService.rename(groupId, userId, request.name()));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Long userId, @PathVariable Long groupId) {
        groupService.delete(groupId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupDetailsResponse> addMember(@AuthenticationPrincipal Long userId, @PathVariable Long groupId,
                                                          @Valid @RequestBody AddMemberRequest request) {
        return ResponseEntity.ok(groupService.addMember(groupId, userId, request.email()));
    }

    @DeleteMapping("/{groupId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(@AuthenticationPrincipal Long userId, @PathVariable Long groupId,
                                             @PathVariable Long memberId) {
        groupService.removeMember(groupId, userId, memberId);
        return ResponseEntity.noContent().build();
    }
}
