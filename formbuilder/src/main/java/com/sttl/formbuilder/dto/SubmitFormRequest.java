package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class SubmitFormRequest {

    @NotNull(message = "Form ID is required")
    private java.util.UUID formId;

    @NotNull(message = "Submission values are required")
    @NotEmpty(message = "Submission cannot be empty")
    private Map<String, Object> values;

    private java.util.UUID formVersionId;
}