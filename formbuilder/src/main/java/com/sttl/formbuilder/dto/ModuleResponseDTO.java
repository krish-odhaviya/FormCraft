package com.sttl.formbuilder.dto;

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
    private boolean isParent;
    private boolean isSubParent;
    private Long parentId;
    private String parentName;
    private Long subParentId;
    private boolean active;
    private int sortOrder;
    private LocalDateTime createdAt;
    private List<ModuleResponseDTO> children;
}
