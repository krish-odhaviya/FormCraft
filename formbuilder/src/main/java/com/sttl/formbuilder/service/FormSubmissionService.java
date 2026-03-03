package com.sttl.formbuilder.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class FormSubmissionService {

    private final FormVersionRepository versionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Spring Boot automatically provides this

    @Transactional
    public void submit(Long versionId, Map<String, Object> values) {

        FormVersion version = versionRepository.findByIdWithFields(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (values == null || values.isEmpty()) {
            throw new RuntimeException("Submission cannot be empty");
        }

        String tableName = version.getTableName();

        Map<String, String> fieldTypes = version.getFields().stream()
                .collect(Collectors.toMap(f -> f.getFieldKey(), f -> f.getFieldType()));

        Set<String> allowedKeys = fieldTypes.keySet();

        Set<String> requiredKeys = version.getFields().stream()
                .filter(f -> f.getRequired() != null && f.getRequired())
                .map(f -> f.getFieldKey())
                .collect(Collectors.toSet());

        // ── Validate Required Fields ──────────────────────────────────────────────
        for (String reqKey : requiredKeys) {
            Object val = values.get(reqKey);
            String fieldType = fieldTypes.get(reqKey);
            boolean isEmpty = false;

            if (val == null) {
                isEmpty = true;
            } else if (val instanceof String && ((String) val).trim().isEmpty()) {
                isEmpty = true;
            } else if (val instanceof List && ((List<?>) val).isEmpty()) {
                isEmpty = true;
            } else if (val instanceof Map && ((Map<?, ?>) val).isEmpty()) {
                isEmpty = true;
            } else if ("STAR_RATING".equalsIgnoreCase(fieldType)) {
                try {
                    int starVal = Integer.parseInt(val.toString());
                    if (starVal <= 0) isEmpty = true;
                } catch (NumberFormatException e) {
                    isEmpty = true;
                }
            } else if ("LINEAR_SCALE".equalsIgnoreCase(fieldType)) {
                if (val.toString().trim().isEmpty()) isEmpty = true;
            }

            if (isEmpty) {
                throw new RuntimeException("Missing required field: " + reqKey);
            }
        }

        // ── Build columns and values ──────────────────────────────────────────────
        List<String> columnsList      = new ArrayList<>();
        List<Object> argumentsList    = new ArrayList<>();
        List<String> placeholdersList = new ArrayList<>(); // ✅ track per-column placeholders

        for (Map.Entry<String, Object> entry : values.entrySet()) {
            String key = entry.getKey();
            Object val = entry.getValue();

            if (!allowedKeys.contains(key)) continue;

            columnsList.add(key);

            String expectedType = fieldTypes.get(key);

            // ── Handle by field type ──────────────────────────────────────────────
            switch (expectedType.toUpperCase()) {

                case "DATE" -> {
                    if (val instanceof String strVal) {
                        val = strVal.trim().isEmpty() ? null : LocalDate.parse(strVal.trim());
                    }
                    placeholdersList.add("?");
                }

                case "TIME" -> {
                    if (val instanceof String strVal) {
                        val = strVal.trim().isEmpty() ? null : LocalTime.parse(strVal.trim());
                    }
                    placeholdersList.add("?");
                }

                case "INTEGER" -> {
                    if (val instanceof String strVal) {
                        val = strVal.trim().isEmpty() ? null : Integer.parseInt(strVal.trim());
                    } else if (val instanceof Number) {
                        val = ((Number) val).intValue();
                    }
                    placeholdersList.add("?");
                }

                case "STAR_RATING", "LINEAR_SCALE" -> {
                    if (val instanceof String strVal) {
                        val = strVal.trim().isEmpty() ? null : Integer.parseInt(strVal.trim());
                    } else if (val instanceof Number) {
                        val = ((Number) val).intValue();
                    }
                    placeholdersList.add("?");
                }

                case "BOOLEAN" -> {
                    if (val instanceof String strVal) {
                        val = Boolean.parseBoolean(strVal.trim());
                    }
                    placeholdersList.add("?");
                }

                case "CHECKBOX_GROUP" -> {
                    if (val instanceof List) {
                        try {
                            val = objectMapper.writeValueAsString(val);
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Failed to serialize checkbox values for: " + key);
                        }
                    }
                    placeholdersList.add("?");
                }

                case "MC_GRID" -> {
                    // ✅ Serialize to JSON string + cast placeholder to jsonb
                    if (val instanceof Map) {
                        try {
                            val = objectMapper.writeValueAsString(val);
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Failed to serialize MC grid values for: " + key);
                        }
                    }
                    placeholdersList.add("?::jsonb"); // ✅ tells Postgres to cast VARCHAR → JSONB
                }

                case "TICK_BOX_GRID" -> {
                    // ✅ Serialize to JSON string + cast placeholder to jsonb
                    if (val instanceof Map) {
                        try {
                            val = objectMapper.writeValueAsString(val);
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Failed to serialize tick box grid values for: " + key);
                        }
                    }
                    placeholdersList.add("?::jsonb"); // ✅ tells Postgres to cast VARCHAR → JSONB
                }

                case "FILE_UPLOAD", "TEXT", "TEXTAREA", "EMAIL",
                     "RADIO", "DROPDOWN" -> {
                    if (val instanceof String strVal && strVal.trim().isEmpty()) {
                        val = null;
                    }
                    placeholdersList.add("?");
                }

                default -> {
                    if (val instanceof String strVal && strVal.trim().isEmpty()) {
                        val = null;
                    }
                    placeholdersList.add("?");
                }
            }

            argumentsList.add(val);
        }

        if (columnsList.isEmpty()) {
            throw new RuntimeException("No valid columns provided for insertion.");
        }

        // ── Build and execute INSERT ──────────────────────────────────────────────
        String columns      = String.join(", ", columnsList);
        String placeholders = String.join(", ", placeholdersList); // ✅ uses per-column placeholders
        String sql          = "INSERT INTO " + tableName + " (" + columns + ") VALUES (" + placeholders + ")";

        System.out.println("=== INSERT SQL ===");
        System.out.println(sql);
        System.out.println("==================");

        jdbcTemplate.update(sql, argumentsList.toArray());
    }

    @Transactional(readOnly = true)
    public SubmissionsResponse getSubmissions(Long formId) {

        FormVersion publishedVersion = versionRepository.findByFormIdAndStatus(formId, FormStatusEnum.PUBLISHED)
                .orElseThrow(() -> new RuntimeException("No published version found for this form"));

        String tableName = publishedVersion.getTableName();

        List<FieldDto> columns = publishedVersion.getFields().stream()
                .map(f -> {
                    FieldDto dto = new FieldDto();
                    dto.setFieldKey(f.getFieldKey());
                    dto.setFieldLabel(f.getFieldLabel());
                    dto.setFieldType(f.getFieldType());
                    dto.setRequired(f.getRequired());
                    dto.setFieldOrder(f.getFieldOrder());
                    dto.setOptions(f.getOptions());

                    // ✅ Map uiConfig flat fields back into a Map for frontend
                    Map<String, Object> uiConfig = new HashMap<>();
                    if (f.getPlaceholder()   != null) uiConfig.put("placeholder",       f.getPlaceholder());
                    if (f.getHelpText()      != null) uiConfig.put("helpText",           f.getHelpText());
                    if (f.getMaxStars()      != null) uiConfig.put("maxStars",           f.getMaxStars());
                    if (f.getScaleMin()      != null) uiConfig.put("scaleMin",           f.getScaleMin());
                    if (f.getScaleMax()      != null) uiConfig.put("scaleMax",           f.getScaleMax());
                    if (f.getLowLabel()      != null) uiConfig.put("lowLabel",           f.getLowLabel());
                    if (f.getHighLabel()     != null) uiConfig.put("highLabel",          f.getHighLabel());
                    if (f.getMaxFileSizeMb() != null) uiConfig.put("maxFileSizeMb",      f.getMaxFileSizeMb());
                    if (f.getAcceptedFileTypes() != null && !f.getAcceptedFileTypes().isEmpty())
                        uiConfig.put("acceptedFileTypes", f.getAcceptedFileTypes());
                    dto.setUiConfig(uiConfig);

                    // ✅ Map gridRows/gridColumns into validation map for frontend
                    Map<String, Object> validation = new HashMap<>();
                    if (f.getMinLength() != null) validation.put("minLength", f.getMinLength());
                    if (f.getMaxLength() != null) validation.put("maxLength", f.getMaxLength());
                    if (f.getMinValue()  != null) validation.put("min",       f.getMinValue());
                    if (f.getMaxValue()  != null) validation.put("max",       f.getMaxValue());
                    if (f.getPattern()   != null) validation.put("pattern",   f.getPattern());
                    // ✅ THIS is what was missing — grid rows and columns
                    if (f.getGridRows()    != null && !f.getGridRows().isEmpty())
                        validation.put("rows",    f.getGridRows());
                    if (f.getGridColumns() != null && !f.getGridColumns().isEmpty())
                        validation.put("columns", f.getGridColumns());
                    dto.setValidation(validation);

                    return dto;
                })
                .collect(Collectors.toList());

        String sql = "SELECT * FROM " + tableName + " WHERE is_delete = false ORDER BY id DESC";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);

        SubmissionsResponse response = new SubmissionsResponse();
        response.setColumns(columns);
        response.setRows(rows);

        return response;
    }

    @Transactional
    public void softDeleteSubmission(Long formId, Long submissionId) {

        FormVersion publishedVersion = versionRepository.findByFormIdAndStatus(formId, FormStatusEnum.PUBLISHED)
                .orElseThrow(() -> new RuntimeException("No published version found for this form"));

        String tableName = publishedVersion.getTableName();

        String sql = "UPDATE " + tableName + " SET is_delete = true WHERE id = ?";

        jdbcTemplate.update(sql, submissionId);
    }
}
