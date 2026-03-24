package com.sttl.formbuilder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ModuleRequestDTO {

    @NotBlank(message = "Module name is required")
    @Size(min = 2, max = 120, message = "Module name must be between 2 and 120 characters")
    private String moduleName;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @Size(max = 255, message = "Prefix cannot exceed 255 characters")
    @Pattern(
            regexp = "^$|^/.*",
            message = "Prefix must start with / (e.g. /admin/users)"
    )
    private String prefix;

    @Size(max = 120, message = "Icon name cannot exceed 120 characters")
    private String iconCss;

    @JsonProperty("isParent")
    private boolean isParent;

    @JsonProperty("isSubParent")
    private boolean isSubParent;

    private java.util.UUID parentId;
    private java.util.UUID subParentId;
    private boolean active = true;
    private int sortOrder = 0;
}