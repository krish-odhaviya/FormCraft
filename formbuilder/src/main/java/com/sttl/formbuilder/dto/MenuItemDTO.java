package com.sttl.formbuilder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("isParent")
    private boolean isParent;
    @JsonProperty("isSubParent")
    private boolean isSubParent;
    private int sortOrder;
    private List<MenuItemDTO> children = new ArrayList<>();
}
