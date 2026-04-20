package com.sttl.formbuilder.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.sttl.formbuilder.entity.FormField;

@Data
@Getter
@Setter
public class FieldDto {
    private UUID id;
    private String fieldKey;
    private String parentId;
    private String fieldLabel;
    private String fieldType;
    private Boolean required;
    private Integer fieldOrder;
    private String conditions;

    // Add these so Spring automatically parses the incoming JSON
    private List<String> options;
    private Map<String, Object> validation;
    private Map<String, Object> uiConfig;

}