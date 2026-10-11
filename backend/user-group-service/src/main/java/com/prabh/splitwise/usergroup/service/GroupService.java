package com.prabh.splitwise.usergroup.service;

import com.prabh.splitwise.usergroup.dto.GroupDetailsResponse;
import com.prabh.splitwise.usergroup.dto.GroupMemberCount;
import com.prabh.splitwise.usergroup.dto.GroupSummaryResponse;
import com.prabh.splitwise.usergroup.dto.MemberResponse;
import com.prabh.splitwise.usergroup.entity.Group;
import com.prabh.splitwise.usergroup.entity.Membership;
import com.prabh.splitwise.usergroup.entity.MembershipId;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.repository.GroupRepository;
import com.prabh.splitwise.usergroup.repository.MembershipRepository;
import com.prabh.splitwise.usergroup.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {
    private final GroupRepository groupRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional
    public GroupDetailsResponse create(Long userId, String name) {
        User creator = userRepository.getReferenceById(userId);
        Group group = groupRepository.save(Group.builder()
                .groupName(name.trim())
                .createdBy(creator)
                .build());
        membershipRepository.save(newMembership(creator, group));
        return toDetails(group);
    }

    @Transactional(readOnly = true)
    public List<GroupSummaryResponse> listForUser(Long userId) {
        List<Group> groups = membershipRepository.findGroupsOfUser(userId);
        if (groups.isEmpty()) return List.of();

        Map<Long, Long> counts = membershipRepository.countMembers(groups.stream().map(Group::getId).toList())
                .stream()
                .collect(Collectors.toMap(GroupMemberCount::groupId, GroupMemberCount::count));
        return groups.stream()
                .map(g -> new GroupSummaryResponse(g.getId(), g.getGroupName(), g.getCreatedBy().getId(),
                        counts.getOrDefault(g.getId(), 0L), g.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupDetailsResponse get(Long groupId, Long userId) {
        return toDetails(requireMember(groupId, userId));
    }

    @Transactional
    public GroupDetailsResponse rename(Long groupId, Long userId, String name) {
        Group group = requireMember(groupId, userId);
        group.setGroupName(name.trim());
        return toDetails(group);
    }

    @Transactional
    public GroupDetailsResponse addMember(Long groupId, Long userId, String email) {
        Group group = requireMember(groupId, userId);
        User member = userService.findUserByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No user has registered with that email"));
        if (membershipRepository.existsById(new MembershipId(member.getId(), groupId))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, member.getName() + " is already in this group");
        }
        try {
            membershipRepository.saveAndFlush(newMembership(member, group));
        } catch (DataIntegrityViolationException e) {       // added concurrently by someone else
            throw new ResponseStatusException(HttpStatus.CONFLICT, member.getName() + " is already in this group");
        }
        return toDetails(group);
    }

    // The creator can remove anyone else; any other member can only remove themselves (leave)
    @Transactional
    public void removeMember(Long groupId, Long userId, Long memberId) {
        Group group = requireMember(groupId, userId);
        Long creatorId = group.getCreatedBy().getId();
        if (memberId.equals(creatorId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The group creator can't leave or be removed. Delete the group instead");
        }
        if (!userId.equals(memberId) && !userId.equals(creatorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group creator can remove other members");
        }
        MembershipId id = new MembershipId(memberId, groupId);
        if (!membershipRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "That user isn't in this group");
        }
        membershipRepository.deleteById(id);
    }

    @Transactional
    public void delete(Long groupId, Long userId) {
        Group group = requireMember(groupId, userId);
        if (!userId.equals(group.getCreatedBy().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group creator can delete the group");
        }
        membershipRepository.deleteAllByGroupId(groupId);
        groupRepository.delete(group);
    }

    // Non-members get the same 404 as a missing group, so group ids can't be probed
    private Group requireMember(Long groupId, Long userId) {
        if (!membershipRepository.existsById(new MembershipId(userId, groupId))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    private static Membership newMembership(User user, Group group) {
        return Membership.builder()
                .id(new MembershipId(user.getId(), group.getId()))
                .user(user)
                .group(group)
                .build();
    }

    private GroupDetailsResponse toDetails(Group group) {
        List<MemberResponse> members = membershipRepository.findMembersOfGroup(group.getId()).stream()
                .map(m -> new MemberResponse(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail(), m.getJoinedAt()))
                .toList();
        return new GroupDetailsResponse(group.getId(), group.getGroupName(), group.getCreatedBy().getId(),
                group.getCreatedAt(), members);
    }
}
