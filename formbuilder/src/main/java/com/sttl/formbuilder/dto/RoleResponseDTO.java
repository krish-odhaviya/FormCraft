package com.sttl.formbuilder.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class RoleResponseDTO {
    private Long id;
    private String roleName;
    private String description;
    private boolean isDefault;
    private boolean isSystem;
    private LocalDateTime createdAt;
    private List<Long> moduleIds;
    private int assignedUserCount;
}
