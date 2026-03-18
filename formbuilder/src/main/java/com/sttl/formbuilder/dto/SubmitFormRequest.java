package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;


@Getter
@Setter
public class SubmitFormRequest {

    @NotNull(message = "Form ID is required")
    private Long formId;

    @NotNull(message = "Submission values are required")
    private Map<String, Object> values;
}
