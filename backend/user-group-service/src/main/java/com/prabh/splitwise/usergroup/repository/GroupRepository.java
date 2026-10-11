package com.prabh.splitwise.usergroup.repository;

import com.prabh.splitwise.usergroup.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, Long> {
}
