package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AddFieldRequest {

    @NotBlank(message = "Field key is required")
    @Size(max = 100, message = "Field key cannot exceed 100 characters")
    @Pattern(
            regexp = "^[a-z0-9_]+$",
            message = "Field key can only contain lowercase letters, numbers, and underscores"
    )
    private String fieldKey;

    private String parentId;

    @NotBlank(message = "Field label is required")
    @Size(max = 255, message = "Field label cannot exceed 255 characters")
    private String fieldLabel;

    @NotBlank(message = "Field type is required")
    @Pattern(
            regexp = "^(TEXT|TEXTAREA|EMAIL|INTEGER|DATE|TIME|BOOLEAN|RADIO|CHECKBOX_GROUP|DROPDOWN|STAR_RATING|LINEAR_SCALE|FILE_UPLOAD|MC_GRID|TICK_BOX_GRID|LOOKUP_DROPDOWN|SECTION|LABEL|PAGE_BREAK|GROUP)$",
            message = "Invalid field type"
    )
    private String fieldType;

    @NotNull(message = "Required flag must be specified")
    private Boolean required;

    @Min(value = 1, message = "Field order must be at least 1")
    private Integer fieldOrder;

    private List<String> options;

    @Size(max = 5000, message = "Conditions JSON cannot exceed 5000 characters")
    private String conditions;

    private ValidationDto validation;
    private UiConfigDto uiConfig;

    // ── Nested DTOs ────────────────────────────────────────────────────────

    @Getter
    @Setter
    public static class ValidationDto {

        @Min(value = 0, message = "Minimum length cannot be negative")
        @Max(value = 10000, message = "Minimum length cannot exceed 10000")
        private Integer minLength;

        @Min(value = 1, message = "Maximum length must be at least 1")
        @Max(value = 10000, message = "Maximum length cannot exceed 10000")
        private Integer maxLength;

        private Double min;
        private Double max;

        @Size(max = 500, message = "Pattern cannot exceed 500 characters")
        private String pattern;

        @Size(max = 255, message = "Validation message cannot exceed 255 characters")
        private String validationMessage;

        private Boolean unique;

        private String numberFormat;
        private List<String> rows;
        private List<String> columns;
    }

    @Getter
    @Setter
    public static class UiConfigDto {

        @Size(max = 255, message = "Placeholder cannot exceed 255 characters")
        private String placeholder;

        @Size(max = 1000, message = "Help text cannot exceed 1000 characters")
        private String helpText;

        @Size(max = 500, message = "Default value cannot exceed 500 characters")
        private String defaultValue;

        private Boolean readOnly;
        private Boolean hidden;

        @Min(value = 1, message = "Max stars must be at least 1")
        @Max(value = 10, message = "Max stars cannot exceed 10")
        private Integer maxStars;

        @Min(value = 0, message = "Scale minimum cannot be negative")
        private Integer scaleMin;

        @Max(value = 100, message = "Scale maximum cannot exceed 100")
        private Integer scaleMax;

        @Size(max = 100, message = "Low label cannot exceed 100 characters")
        private String lowLabel;

        @Size(max = 100, message = "High label cannot exceed 100 characters")
        private String highLabel;

        private List<String> acceptedFileTypes;

        @Min(value = 1, message = "Max file size must be at least 1 MB")
        @Max(value = 100, message = "Max file size cannot exceed 100 MB")
        private Integer maxFileSizeMb;

        @Size(max = 120, message = "Source table name cannot exceed 120 characters")
        private String sourceTable;

        @Size(max = 120, message = "Source column name cannot exceed 120 characters")
        private String sourceColumn;

        @Size(max = 120, message = "Source display column cannot exceed 120 characters")
        private String sourceDisplayColumn;
    }
}