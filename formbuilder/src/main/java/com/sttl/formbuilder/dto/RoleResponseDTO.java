package com.sttl.formbuilder.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import java.util.UUID;

@Data
public class RoleResponseDTO {
    private UUID id;
    private String roleName;
    private String description;
    private boolean isDefault;
    private LocalDateTime createdAt;
    private List<UUID> moduleIds;
    private int assignedUserCount;

    private boolean canCreateForm;
    private boolean canEditForm;
    private boolean canDeleteForm;
    private boolean canArchiveForm;
    private boolean canViewSubmissions;
    private boolean canDeleteSubmissions;
}
