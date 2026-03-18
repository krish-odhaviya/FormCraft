package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class RoleRequestDTO {
    @NotBlank(message = "Role name is required")
    private String roleName;
    private String description;
    /** List of module IDs to assign to this role */
    private List<Long> moduleIds;

    private boolean canCreateForm;
    private boolean canEditForm;
    private boolean canDeleteForm;
    private boolean canArchiveForm;
    private boolean canViewSubmissions;
    private boolean canDeleteSubmissions;
}
