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
    @Pattern(
            regexp = "^[a-z][a-z0-9_]{2,49}$",
            message = "Form name must be 3-50 characters, start with a lowercase letter, and contain only lowercase letters, numbers, or underscores (no spaces)."
    )
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;
}