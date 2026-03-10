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

    private String conditions;

    private ValidationDto validation;
    private UiConfigDto uiConfig;

    @Getter
    @Setter
    public static class ValidationDto {
        private Integer minLength;
        private Integer maxLength;
        private Double min;
        private Double max;
        private String pattern;
        private String validationMessage;
        private Boolean unique;

        // Grid field rows & columns
        private List<String> rows;
        private List<String> columns;
    }

    @Getter
    @Setter
    public static class UiConfigDto {
        private String placeholder;
        private String helpText;
        private String defaultValue;
        private Boolean readOnly;
        private Boolean hidden;

        // Star Rating
        private Integer maxStars;

        // Linear Scale
        private Integer scaleMin;
        private Integer scaleMax;
        private String lowLabel;
        private String highLabel;

        // File Upload
        private List<String> acceptedFileTypes;
        private Integer maxFileSizeMb;

        // Inside UiConfigDto class, add:
        private String sourceTable;
        private String sourceColumn;
        private String sourceDisplayColumn;


    }
}