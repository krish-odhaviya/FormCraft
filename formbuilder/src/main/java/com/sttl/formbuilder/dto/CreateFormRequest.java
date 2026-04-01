package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateFormRequest {

    /**
     * Human-readable display name of the form (shown in UI).
     * SRS §3.1: Forms have a display name.
     */
    @NotBlank(message = "Form display name is required")
    @Size(max = 255, message = "Form name cannot exceed 255 characters")
    private String name;

    /**
     * Stable, machine-readable code used for URL routing and table naming.
     * SRS data model: code VARCHAR(100) UNIQUE — must be lowercase, alphanumeric + underscores.
     * Immutable once the form is published.
     */
    @NotBlank(message = "Form code is required")
    @Pattern(
            regexp = "^[a-z][a-z0-9_]{2,99}$",
            message = "Form code must be 3-100 characters, start with a lowercase letter, and contain only lowercase letters, numbers, or underscores."
    )
    private String code;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;
}