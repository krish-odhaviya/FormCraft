package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AccessRequestDTO {

    private java.util.UUID formId; // null = CREATE_FORM request (system-wide)

    @NotBlank(message = "Request type is required")
    @Pattern(
            regexp = "^(VIEW_FORM|CREATE_FORM)$",
            message = "Request type must be VIEW_FORM or CREATE_FORM"
    )
    private String type;

    @Size(max = 500, message = "Reason cannot exceed 500 characters")
    private String reason;
}