package com.sttl.formbuilder.dto.internal;

import lombok.Data;

@Data
public class RuleConditionDTO {
    private String fieldKey;
    private String operator; // equals, notEquals, contains, greaterThan, lessThan, isEmpty, isNotEmpty
    private String value;
    
    // For backwards compatibility mapping
    public String getField() { return fieldKey; }
    public void setField(String field) { this.fieldKey = field; }
}
