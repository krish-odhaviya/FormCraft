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
    private LocalDateTime createdAt;
    private List<Long> moduleIds;
    private int assignedUserCount;

    private boolean canCreateForm;
    private boolean canEditForm;
    private boolean canDeleteForm;
    private boolean canArchiveForm;
    private boolean canViewSubmissions;
    private boolean canDeleteSubmissions;
}
