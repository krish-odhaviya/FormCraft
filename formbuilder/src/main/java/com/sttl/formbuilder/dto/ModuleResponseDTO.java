package com.sttl.formbuilder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ModuleResponseDTO {
    private Long id;
    private String moduleName;
    private String description;
    private String prefix;
    private String iconCss;
    @JsonProperty("isParent")
    private boolean isParent;
    @JsonProperty("isSubParent")
    private boolean isSubParent;
    private Long parentId;
    private String parentName;
    private Long subParentId;
    private boolean active;
    private int sortOrder;
    private LocalDateTime createdAt;
    private List<ModuleResponseDTO> children;
}
