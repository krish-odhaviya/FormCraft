package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class SubmitFormRequest {

    @NotNull(message = "Form ID is required")
    private UUID formId;

    @NotNull(message = "Submission values are required")
    @NotEmpty(message = "Submission cannot be empty")
    private Map<String, Object> values;

    private UUID formVersionId;
}