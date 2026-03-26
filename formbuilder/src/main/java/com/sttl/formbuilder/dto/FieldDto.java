package com.sttl.formbuilder.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Getter
@Setter
public class FieldDto {
    private UUID id;
    private String fieldKey;
    private String parentId;
    private String fieldLabel;
    private String fieldType;
    private Boolean required;
    private Integer fieldOrder;
    private String conditions;

    // Add these so Spring automatically parses the incoming JSON
    private List<String> options;
    private Map<String, Object> validation;
    private Map<String, Object> uiConfig;

    public static FieldDto fromEntity(com.sttl.formbuilder.entity.FormField f) {
        FieldDto fd = new FieldDto();
        fd.setId(f.getId());
        fd.setFieldKey(f.getFieldKey());
        fd.setParentId(f.getParentId());
        fd.setFieldLabel(f.getFieldLabel());
        fd.setFieldType(f.getFieldType());
        fd.setRequired(f.getRequired());
        fd.setConditions(f.getConditions());
        fd.setFieldOrder(f.getFieldOrder());

        // --- Map Options ---
        if (f.getOptions() != null) {
            fd.setOptions(new java.util.ArrayList<>(f.getOptions()));
        }

        // --- Map Validation ---
        java.util.Map<String, Object> validationMap = new java.util.HashMap<>();
        if (f.getMinLength()         != null) validationMap.put("minLength",         f.getMinLength());
        if (f.getMaxLength()         != null) validationMap.put("maxLength",         f.getMaxLength());
        if (f.getMinValue()          != null) validationMap.put("min",               f.getMinValue());
        if (f.getMaxValue()          != null) validationMap.put("max",               f.getMaxValue());
        if (f.getPattern()           != null) validationMap.put("pattern",           f.getPattern());
        if (f.getValidationMessage() != null) validationMap.put("validationMessage", f.getValidationMessage());
        if (f.getIsUnique()          != null) validationMap.put("unique",            f.getIsUnique());
        validationMap.put("numberFormat", f.getNumberFormat() != null ? f.getNumberFormat() : "INTEGER");
        if (f.getGridRows() != null && !f.getGridRows().isEmpty())
            validationMap.put("rows", f.getGridRows());
        if (f.getGridColumns() != null && !f.getGridColumns().isEmpty())
            validationMap.put("columns", f.getGridColumns());
        fd.setValidation(validationMap);

        // --- Map UI Config ---
        java.util.Map<String, Object> uiMap = new java.util.HashMap<>();
        if (f.getPlaceholder()  != null) uiMap.put("placeholder",  f.getPlaceholder());
        if (f.getHelpText()     != null) uiMap.put("helpText",      f.getHelpText());
        if (f.getDefaultValue() != null) uiMap.put("defaultValue",  f.getDefaultValue());
        if (f.getReadOnly()     != null) uiMap.put("readOnly",      f.getReadOnly());
        if (f.getIsHidden()     != null) uiMap.put("hidden",        f.getIsHidden());
        if (f.getMaxStars()     != null) uiMap.put("maxStars",      f.getMaxStars());
        if (f.getScaleMin()     != null) uiMap.put("scaleMin",      f.getScaleMin());
        if (f.getScaleMax()     != null) uiMap.put("scaleMax",      f.getScaleMax());
        if (f.getLowLabel()     != null) uiMap.put("lowLabel",      f.getLowLabel());
        if (f.getHighLabel()    != null) uiMap.put("highLabel",     f.getHighLabel());
        if (f.getMaxFileSizeMb() != null) uiMap.put("maxFileSizeMb", f.getMaxFileSizeMb());
        if (f.getAcceptedFileTypes() != null && !f.getAcceptedFileTypes().isEmpty())
            uiMap.put("acceptedFileTypes", f.getAcceptedFileTypes());
        if (f.getSourceTable()         != null) uiMap.put("sourceTable",         f.getSourceTable());
        if (f.getSourceColumn()        != null) uiMap.put("sourceColumn",        f.getSourceColumn());
        if (f.getSourceDisplayColumn() != null) uiMap.put("sourceDisplayColumn", f.getSourceDisplayColumn());
        uiMap.put("selectionMode", f.getSelectionMode() != null ? f.getSelectionMode() : "single");
        if (f.getMaxSelections() != null) uiMap.put("maxSelections", f.getMaxSelections());
        fd.setUiConfig(uiMap);

        return fd;
    }
}