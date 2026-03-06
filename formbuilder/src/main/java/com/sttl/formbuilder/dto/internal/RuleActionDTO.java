package com.sttl.formbuilder.dto.internal;

import lombok.Data;

@Data
public class RuleActionDTO {
    private String type;
    private String message;
    private String targetField;
    private String value;
}
