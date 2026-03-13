package com.sttl.formbuilder.dto;

import lombok.Data;

import java.util.List;

@Data
public class RoleRequestDTO {
    private String roleName;
    private String description;
    /** List of module IDs to assign to this role */
    private List<Long> moduleIds;
}
