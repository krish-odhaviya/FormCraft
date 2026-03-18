package com.sttl.formbuilder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModuleRequestDTO {
    @NotBlank(message = "Module name is required")
    private String moduleName;
    private String description;
    private String prefix;
    private String iconCss;
    @JsonProperty("isParent")
    private boolean isParent;
    @JsonProperty("isSubParent")
    private boolean isSubParent;
    private Long parentId;
    private Long subParentId;
    private boolean active = true;
    private int sortOrder = 0;
}
