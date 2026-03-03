package com.sttl.formbuilder.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.VersionDto;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;

@Service
public class FormService {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final FormFieldRepository formFieldRepository;

    public FormService(FormRepository formRepository,
                       FormVersionRepository formVersionRepository,
                       FormFieldRepository formFieldRepository) {
        this.formRepository = formRepository;
        this.formVersionRepository = formVersionRepository;
        this.formFieldRepository = formFieldRepository;
    }

    public List<Form> getAllForms() {
        return formRepository.findAll();
    }

    public Form createForm(String name, String description) {

        if (formRepository.existsByName(name)) {
            throw new RuntimeException("Form name already exists");
        }

        Form form = new Form();
        form.setName(name);
        form.setDescription(description);

        return formRepository.save(form);
    }

    public FormDetailsResponse getFormWithStructure(Long formId) {
        // 1. Fetch the main Form
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        // 2. Fetch all versions
        List<FormVersion> versions = formVersionRepository
                .findByFormIdOrderByVersionNumberAsc(formId);

        FormDetailsResponse response = new FormDetailsResponse();
        response.setId(form.getId());
        response.setName(form.getName());
        response.setDescription(form.getDescription());
        response.setCreatedAt(form.getCreatedAt());
        response.setUpdatedAt(form.getUpdatedAt());

        // 3. Map Versions to DTOs
        List<VersionDto> versionDtos = versions.stream()
                .map(v -> {
                    VersionDto dto = new VersionDto();
                    dto.setId(v.getId());
                    dto.setVersionNumber(v.getVersionNumber());
                    dto.setStatus(String.valueOf(v.getStatus()));
                    dto.setTableName(v.getTableName());
                    dto.setCreatedAt(v.getCreatedAt());
                    dto.setPublishedAt(v.getPublishedAt());

                    // 4. Fetch Fields for this version
                    List<FormField> fields = formFieldRepository
                            .findByVersionIdOrderByFieldOrder(v.getId());

                    // 5. Map Entities to FieldDto with Nested Maps
                    List<FieldDto> fieldDtos = fields.stream()
                            .map(f -> {
                                FieldDto fd = new FieldDto();
                                fd.setId(f.getId());
                                fd.setFieldKey(f.getFieldKey());
                                fd.setFieldLabel(f.getFieldLabel());
                                fd.setFieldType(f.getFieldType());
                                fd.setRequired(f.getRequired());
                                fd.setFieldOrder(f.getFieldOrder());

                                // --- Map Options (from separate table) ---
                                if (f.getOptions() != null) {
                                    fd.setOptions(new ArrayList<>(f.getOptions()));
                                }

                                // --- Map Validation (Entity Columns -> Map) ---
                                Map<String, Object> validationMap = new HashMap<>();
                                if (f.getMinLength()         != null) validationMap.put("minLength",         f.getMinLength());
                                if (f.getMaxLength()         != null) validationMap.put("maxLength",         f.getMaxLength());
                                if (f.getMinValue()          != null) validationMap.put("min",               f.getMinValue());
                                if (f.getMaxValue()          != null) validationMap.put("max",               f.getMaxValue());
                                if (f.getPattern()           != null) validationMap.put("pattern",           f.getPattern());
                                if (f.getValidationMessage() != null) validationMap.put("validationMessage", f.getValidationMessage());
                                // ✅ Grid rows and columns
                                if (f.getGridRows() != null && !f.getGridRows().isEmpty())
                                    validationMap.put("rows", f.getGridRows());
                                if (f.getGridColumns() != null && !f.getGridColumns().isEmpty())
                                    validationMap.put("columns", f.getGridColumns());
                                fd.setValidation(validationMap);

                                // --- Map UI Config (Entity Columns -> Map) ---
                                Map<String, Object> uiMap = new HashMap<>();
                                if (f.getPlaceholder()  != null) uiMap.put("placeholder",  f.getPlaceholder());
                                if (f.getHelpText()     != null) uiMap.put("helpText",      f.getHelpText());
                                if (f.getDefaultValue() != null) uiMap.put("defaultValue",  f.getDefaultValue());
                                if (f.getReadOnly()     != null) uiMap.put("readOnly",      f.getReadOnly());
                                // ✅ Star rating
                                if (f.getMaxStars()     != null) uiMap.put("maxStars",      f.getMaxStars());
                                // ✅ Linear scale
                                if (f.getScaleMin()     != null) uiMap.put("scaleMin",      f.getScaleMin());
                                if (f.getScaleMax()     != null) uiMap.put("scaleMax",      f.getScaleMax());
                                if (f.getLowLabel()     != null) uiMap.put("lowLabel",      f.getLowLabel());
                                if (f.getHighLabel()    != null) uiMap.put("highLabel",     f.getHighLabel());
                                // ✅ File upload
                                if (f.getMaxFileSizeMb() != null) uiMap.put("maxFileSizeMb", f.getMaxFileSizeMb());
                                if (f.getAcceptedFileTypes() != null && !f.getAcceptedFileTypes().isEmpty())
                                    uiMap.put("acceptedFileTypes", f.getAcceptedFileTypes());
                                fd.setUiConfig(uiMap);

                                return fd;
                            })
                            .collect(Collectors.toList());

                    dto.setFields(fieldDtos);
                    return dto;
                })
                .collect(Collectors.toList());

        response.setVersions(versionDtos);
        return response;
    }
}
