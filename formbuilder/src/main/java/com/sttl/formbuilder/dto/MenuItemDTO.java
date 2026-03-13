package com.sttl.formbuilder.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Hierarchical node used for the sidebar menu API response.
 */
@Data
@NoArgsConstructor
public class MenuItemDTO {
    private Long id;
    private String moduleName;
    private String prefix;
    private String iconCss;
    private boolean isParent;
    private boolean isSubParent;
    private int sortOrder;
    private List<MenuItemDTO> children = new ArrayList<>();
}
