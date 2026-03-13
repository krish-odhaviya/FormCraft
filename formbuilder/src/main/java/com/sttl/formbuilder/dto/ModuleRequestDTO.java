package com.sttl.formbuilder.dto;

import lombok.Data;

@Data
public class ModuleRequestDTO {
    private String moduleName;
    private String description;
    private String prefix;
    private String iconCss;
    private boolean isParent;
    private boolean isSubParent;
    private Long parentId;
    private Long subParentId;
    private boolean active = true;
    private int sortOrder = 0;
}
