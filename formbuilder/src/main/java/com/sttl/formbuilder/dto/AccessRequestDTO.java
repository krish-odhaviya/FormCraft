package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AccessRequestDTO {
    private Long formId; // null for form creation request
    @NotBlank(message = "Request type is required")
    private String type; // VIEW_FORM, CREATE_FORM
    private String reason;
}
