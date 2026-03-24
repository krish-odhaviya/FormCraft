package com.sttl.formbuilder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import java.util.UUID;

@Data
public class ModuleResponseDTO {
    private UUID id;
    private String moduleName;
    private String description;
    private String prefix;
    private String iconCss;
    @JsonProperty("isParent")
    private boolean isParent;
    @JsonProperty("isSubParent")
    private boolean isSubParent;
    private UUID parentId;
    private String parentName;
    private UUID subParentId;
    private boolean active;
    private int sortOrder;
    private LocalDateTime createdAt;
    private List<ModuleResponseDTO> children;
}
