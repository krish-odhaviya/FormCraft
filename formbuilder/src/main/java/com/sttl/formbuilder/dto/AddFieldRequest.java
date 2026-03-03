package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AddFieldRequest {

    @NotBlank
    private String fieldKey;

    @NotBlank
    private String fieldLabel;

    @NotNull
    private String fieldType;

    @NotNull
    private Boolean required;

    private Integer fieldOrder;

    private List<String> options;

    // Catch the nested JSON objects from React
    private ValidationDto validation;
    private UiConfigDto uiConfig;

    // --- Inner DTOs ---

    @Getter
    @Setter
    public static class ValidationDto {
        private Integer minLength;
        private Integer maxLength;
        private Double min; // Maps to min in React
        private Double max; // Maps to max in React
        private String pattern;
        private String validationMessage;
    }

    @Getter
    @Setter
    public static class UiConfigDto {
        private String placeholder;
        private String helpText;
        private String defaultValue;
        private Boolean readOnly;
    }
}