package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class RoleRequestDTO {

    @NotBlank(message = "Role name is required")
    @Size(min = 2, max = 80, message = "Role name must be between 2 and 80 characters")
    @Pattern(
            regexp = "^[A-Z0-9_]+$",
            message = "Role name must be uppercase letters, numbers, and underscores only (e.g. PROJECT_MANAGER)"
    )
    private String roleName;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    private List<Long> moduleIds;

    private boolean canCreateForm;
    private boolean canEditForm;
    private boolean canDeleteForm;
    private boolean canArchiveForm;
    private boolean canViewSubmissions;
    private boolean canDeleteSubmissions;
}