package com.sttl.formbuilder.mapper;

import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.entity.FormField;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.HashMap;
import java.util.Map;

/**
 * Mapper for FormField entity and FieldDto.
 * Handles the complexity of mapping flat entity fields into nested UI/Validation maps.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface FieldMapper {

    @Mapping(target = "validation", ignore = true)
    @Mapping(target = "uiConfig", ignore = true)
    FieldDto toDto(FormField entity);

    @AfterMapping
    default void populateMaps(FormField entity, @MappingTarget FieldDto dto) {
        // --- Validation Map ---
        Map<String, Object> validation = new HashMap<>();
        if (entity.getMinLength() != null) validation.put("minLength", entity.getMinLength());
        if (entity.getMaxLength() != null) validation.put("maxLength", entity.getMaxLength());
        if (entity.getMinValue() != null) validation.put("min", entity.getMinValue());
        if (entity.getMaxValue() != null) validation.put("max", entity.getMaxValue());
        if (entity.getPattern() != null) validation.put("pattern", entity.getPattern());
        if (entity.getValidationMessage() != null) validation.put("validationMessage", entity.getValidationMessage());
        if (entity.getIsUnique() != null) validation.put("unique", entity.getIsUnique());
        validation.put("numberFormat", entity.getNumberFormat() != null ? entity.getNumberFormat() : "INTEGER");
        
        if (entity.getGridRows() != null && !entity.getGridRows().isEmpty()) {
            validation.put("rows", entity.getGridRows());
        }
        if (entity.getGridColumns() != null && !entity.getGridColumns().isEmpty()) {
            validation.put("columns", entity.getGridColumns());
        }
        if (entity.getAllowedDomains() != null && !entity.getAllowedDomains().isEmpty()) {
            validation.put("allowedDomains", entity.getAllowedDomains());
        }
        dto.setValidation(validation);

        // --- UI Config Map ---
        Map<String, Object> uiMap = new HashMap<>();
        if (entity.getPlaceholder() != null) uiMap.put("placeholder", entity.getPlaceholder());
        if (entity.getHelpText() != null) uiMap.put("helpText", entity.getHelpText());
        if (entity.getDefaultValue() != null) uiMap.put("defaultValue", entity.getDefaultValue());
        if (entity.getReadOnly() != null) uiMap.put("readOnly", entity.getReadOnly());
        if (entity.getIsHidden() != null) uiMap.put("hidden", entity.getIsHidden());
        if (entity.getMaxStars() != null) uiMap.put("maxStars", entity.getMaxStars());
        if (entity.getScaleMin() != null) uiMap.put("scaleMin", entity.getScaleMin());
        if (entity.getScaleMax() != null) uiMap.put("scaleMax", entity.getScaleMax());
        if (entity.getLowLabel() != null) uiMap.put("lowLabel", entity.getLowLabel());
        if (entity.getHighLabel() != null) uiMap.put("highLabel", entity.getHighLabel());
        if (entity.getMaxFileSizeMb() != null) uiMap.put("maxFileSizeMb", entity.getMaxFileSizeMb());
        
        if (entity.getAcceptedFileTypes() != null && !entity.getAcceptedFileTypes().isEmpty()) {
            uiMap.put("acceptedFileTypes", entity.getAcceptedFileTypes());
        }
        if (entity.getSourceTable() != null) uiMap.put("sourceTable", entity.getSourceTable());
        if (entity.getSourceColumn() != null) uiMap.put("sourceColumn", entity.getSourceColumn());
        if (entity.getSourceDisplayColumn() != null) uiMap.put("sourceDisplayColumn", entity.getSourceDisplayColumn());
        
        uiMap.put("selectionMode", entity.getSelectionMode() != null ? entity.getSelectionMode() : "single");
        if (entity.getMaxSelections() != null) uiMap.put("maxSelections", entity.getMaxSelections());
        
        dto.setUiConfig(uiMap);
    }
}
