package com.prabh.splitwise.usergroup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GroupNameRequest(@NotBlank @Size(max = 100) String name) {
}
