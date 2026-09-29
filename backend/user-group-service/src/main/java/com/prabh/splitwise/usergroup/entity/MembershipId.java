package com.prabh.splitwise.usergroup.entity;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MembershipId implements Serializable {
    private Long userId;
    private Long groupId;
}
