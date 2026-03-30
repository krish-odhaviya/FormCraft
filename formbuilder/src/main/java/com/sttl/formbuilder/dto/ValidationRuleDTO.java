package com.sttl.formbuilder.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ValidationRuleDTO {
    private String id; // UUID as string
    private String scope; // 'FIELD' | 'FORM'
    private String fieldKey;
    private String expression;
    private String errorMessage;
    private Integer executionOrder;
}
