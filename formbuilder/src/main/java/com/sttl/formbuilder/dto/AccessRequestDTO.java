package com.sttl.formbuilder.dto;

import lombok.Data;

@Data
public class AccessRequestDTO {
    private Long formId; // null for form creation request
    private String type; // VIEW_FORM, CREATE_FORM
    private String reason;
}
