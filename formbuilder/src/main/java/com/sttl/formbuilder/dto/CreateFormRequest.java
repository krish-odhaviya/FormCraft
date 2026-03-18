package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateFormRequest {

    @NotBlank(message = "Form name is required")
    @Size(min = 3, max = 150, message = "Form name must be between 3 and 150 characters")
    @Pattern(
            regexp = "^[\\w\\s\\-().,!?&]+$",
            message = "Form name contains invalid characters"
    )
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;
}