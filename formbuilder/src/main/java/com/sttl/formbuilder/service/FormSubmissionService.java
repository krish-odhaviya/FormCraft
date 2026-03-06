package com.sttl.formbuilder.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.exception.ValidationException;
import com.sttl.formbuilder.repository.FormVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sttl.formbuilder.dto.internal.FormRuleDTO;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class FormSubmissionService {

    private final FormVersionRepository versionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final RuleEngineService ruleEngineService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Spring Boot automatically provides this

    @Transactional
    public void submit(Long versionId, Map<String, Object> values) {

        FormVersion version = versionRepository.findByIdWithFields(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (values == null || values.isEmpty()) {
            throw new RuntimeException("Submission cannot be empty");
        }

        // --- Rule Engine Pre-save Validation ---
        ruleEngineService.validateSubmission(version.getFields(), values);
        // ---------------------------------------

        String tableName = version.getTableName();

        // ── Build field lookup maps ───────────────────────────────────────────────
        Map<String, String> fieldTypes = new HashMap<>();
        Map<String, FormField> fieldMap = new HashMap<>();

        for (FormField f : version.getFields()) {
            fieldTypes.put(f.getFieldKey(), f.getFieldType());
            fieldMap.put(f.getFieldKey(), f);
        }

        Set<String> allowedKeys = fieldTypes.keySet();
        Map<String, String> errors = new LinkedHashMap<>();

        // ── Validate Required Fields ──────────────────────────────────────────────
        for (FormField field : version.getFields()) {
            String key = field.getFieldKey();
            String fieldType = field.getFieldType();
            Object val = values.get(key);
            String label = field.getFieldLabel();

            if (field.getRequired() == null || !field.getRequired()) continue;

            // --- Rule Engine check: Hidden fields are not required ---
            if (field.getConditions() != null && !field.getConditions().trim().isEmpty()) {
                try {
                    FormRuleDTO conds = objectMapper.readValue(field.getConditions(), FormRuleDTO.class);
                    // Check action. If action is hide, and rule evaluates to true, field is hidden.
                    boolean isActive = true;
                    if(conds != null) {
                        boolean rulePasses = ruleEngineService.evaluateRule(conds, values);
                        if("hide".equalsIgnoreCase(conds.getAction()) && rulePasses) isActive = false;
                        else if("hide".equalsIgnoreCase(conds.getAction()) && !rulePasses) isActive = true; // explicitly making visible
                        else if("show".equalsIgnoreCase(conds.getAction()) && !rulePasses) isActive = false;
                    }

                    if(!isActive) continue; // Skip required check for hidden field
                } catch (Exception e) {
                   System.err.println("Condition parsing failed for field " + key);
                }
            }
            // -------------------------------------------------------------

            boolean isEmpty = false;
            if (val == null)
                isEmpty = true;
            else if (val instanceof String s && s.trim().isEmpty())
                isEmpty = true;
            else if (val instanceof List<?> l && l.isEmpty())
                isEmpty = true;
            else if (val instanceof Map<?, ?> m && m.isEmpty())
                isEmpty = true;
            else if ("STAR_RATING".equalsIgnoreCase(fieldType)) {
                try {
                    if (Integer.parseInt(val.toString()) <= 0) isEmpty = true;
                } catch (NumberFormatException e) {
                    isEmpty = true;
                }
            } else if ("LINEAR_SCALE".equalsIgnoreCase(fieldType)) {
                if (val.toString().trim().isEmpty()) isEmpty = true;
            } else if ("LOOKUP_DROPDOWN".equalsIgnoreCase(fieldType)) {
                // required check for lookup: must have a value key
                if (val instanceof Map<?, ?> m && m.get("value") == null) isEmpty = true;
            }

            if (isEmpty) errors.put(key, "'" + label + "' is required.");
        }

        // ── Validate Field-Level Rules ────────────────────────────────────────────
        for (FormField field : version.getFields()) {
            String key = field.getFieldKey();
            String fieldType = field.getFieldType();
            Object val = values.get(key);
            String label = field.getFieldLabel();

            if (errors.containsKey(key)) continue;
            if (val == null) continue;
            if (val instanceof String s && s.trim().isEmpty()) continue;

            // --- Rule Engine skip validation on hidden fields ---
            boolean skipValidation = false;
            if (field.getConditions() != null && !field.getConditions().trim().isEmpty()) {
                try {
                    FormRuleDTO conds = objectMapper.readValue(field.getConditions(), FormRuleDTO.class);
                    if(conds != null) {
                        boolean rulePasses = ruleEngineService.evaluateRule(conds, values);
                        if("hide".equalsIgnoreCase(conds.getAction()) && rulePasses) skipValidation = true;
                        if("show".equalsIgnoreCase(conds.getAction()) && !rulePasses) skipValidation = true;
                    }
                } catch (Exception e) {}
            }
            if(skipValidation) continue;
            // ------------------------------------------------

            switch (fieldType.toUpperCase()) {

                case "TEXT", "TEXTAREA" -> {
                    String strVal = val.toString();
                    if (field.getMinLength() != null && strVal.length() < field.getMinLength())
                        errors.put(key, "'" + label + "' must be at least " + field.getMinLength() + " characters.");
                    else if (field.getMaxLength() != null && strVal.length() > field.getMaxLength())
                        errors.put(key, "'" + label + "' must be at most " + field.getMaxLength() + " characters.");
                    else if (field.getPattern() != null && !strVal.matches(field.getPattern()))
                        errors.put(key, field.getValidationMessage() != null
                                ? field.getValidationMessage()
                                : "'" + label + "' format is invalid.");
                }

                case "EMAIL" -> {
                    if (!val.toString().trim().matches("^[\\w.+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"))
                        errors.put(key, "'" + label + "' must be a valid email address.");
                }

                case "INTEGER" -> {
                    try {
                        double numVal = Double.parseDouble(val.toString());
                        if (field.getMinValue() != null && numVal < field.getMinValue())
                            errors.put(key, "'" + label + "' must be at least " + field.getMinValue().intValue() + ".");
                        else if (field.getMaxValue() != null && numVal > field.getMaxValue())
                            errors.put(key, "'" + label + "' must be at most " + field.getMaxValue().intValue() + ".");
                    } catch (NumberFormatException e) {
                        errors.put(key, "'" + label + "' must be a valid number.");
                    }
                }

                case "STAR_RATING" -> {
                    try {
                        int starVal = Integer.parseInt(val.toString());
                        int max = field.getMaxStars() != null ? field.getMaxStars() : 5;
                        if (starVal < 1 || starVal > max)
                            errors.put(key, "'" + label + "' must be between 1 and " + max + ".");
                    } catch (NumberFormatException e) {
                        errors.put(key, "'" + label + "' must be a valid rating.");
                    }
                }

                case "LINEAR_SCALE" -> {
                    try {
                        int scaleVal = Integer.parseInt(val.toString());
                        int min = field.getScaleMin() != null ? field.getScaleMin() : 1;
                        int max = field.getScaleMax() != null ? field.getScaleMax() : 5;
                        if (scaleVal < min || scaleVal > max)
                            errors.put(key, "'" + label + "' must be between " + min + " and " + max + ".");
                    } catch (NumberFormatException e) {
                        errors.put(key, "'" + label + "' must be a valid scale value.");
                    }
                }

                case "DATE" -> {
                    try {
                        LocalDate.parse(val.toString().trim());
                    } catch (Exception e) {
                        errors.put(key, "'" + label + "' must be a valid date (YYYY-MM-DD).");
                    }
                }

                case "TIME" -> {
                    try {
                        LocalTime.parse(val.toString().trim());
                    } catch (Exception e) {
                        errors.put(key, "'" + label + "' must be a valid time (HH:MM).");
                    }
                }

                case "FILE_UPLOAD" -> {
                    if (field.getAcceptedFileTypes() != null && !field.getAcceptedFileTypes().isEmpty()) {
                        String lower = val.toString().toLowerCase();
                        boolean accept = field.getAcceptedFileTypes().stream()
                                .anyMatch(ext -> lower.endsWith(ext.toLowerCase()));
                        if (!accept)
                            errors.put(key, "'" + label + "' only accepts: "
                                    + String.join(", ", field.getAcceptedFileTypes()));
                    }
                }

                case "MC_GRID" -> {
                    if (field.getRequired() != null && field.getRequired() && val instanceof Map<?, ?> gridVal) {
                        List<String> rows = field.getGridRows();
                        if (rows != null) {
                            for (String row : rows) {
                                Object rowVal = gridVal.get(row);
                                if (rowVal == null || rowVal.toString().trim().isEmpty()) {
                                    errors.put(key, "'" + label + "': please select an option for every row.");
                                    break;
                                }
                            }
                        }
                    }
                }

                // ✅ No extra validation for LOOKUP_DROPDOWN — required check above is enough
                default -> {
                }
            }
        }

        // ✅ Throw ALL errors at once
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }

        // ── Build columns and values ──────────────────────────────────────────────
        List<String> columnsList = new ArrayList<>();
        List<Object> argumentsList = new ArrayList<>();
        List<String> placeholdersList = new ArrayList<>();

        for (Map.Entry<String, Object> entry : values.entrySet()) {
            String key = entry.getKey();
            Object val = entry.getValue();

            if (!allowedKeys.contains(key)) continue;

            columnsList.add(key);
            String expectedType = fieldTypes.get(key);

            switch (expectedType.toUpperCase()) {

                case "DATE" -> {
                    if (val instanceof String strVal)
                        val = strVal.trim().isEmpty() ? null : LocalDate.parse(strVal.trim());
                    placeholdersList.add("?");
                }

                case "TIME" -> {
                    if (val instanceof String strVal)
                        val = strVal.trim().isEmpty() ? null : LocalTime.parse(strVal.trim());
                    placeholdersList.add("?");
                }

                case "INTEGER" -> {
                    if (val instanceof String strVal)
                        val = strVal.trim().isEmpty() ? null : Integer.parseInt(strVal.trim());
                    else if (val instanceof Number)
                        val = ((Number) val).intValue();
                    placeholdersList.add("?");
                }

                case "STAR_RATING", "LINEAR_SCALE" -> {
                    if (val instanceof String strVal)
                        val = strVal.trim().isEmpty() ? null : Integer.parseInt(strVal.trim());
                    else if (val instanceof Number)
                        val = ((Number) val).intValue();
                    placeholdersList.add("?");
                }

                case "BOOLEAN" -> {
                    if (val instanceof String strVal)
                        val = Boolean.parseBoolean(strVal.trim());
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
                    if (val instanceof Map) {
                        try {
                            val = objectMapper.writeValueAsString(val);
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Failed to serialize MC grid values for: " + key);
                        }
                    }
                    placeholdersList.add("?::jsonb");
                }

                case "TICK_BOX_GRID" -> {
                    if (val instanceof Map) {
                        try {
                            val = objectMapper.writeValueAsString(val);
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Failed to serialize tick box grid values for: " + key);
                        }
                    }
                    placeholdersList.add("?::jsonb");
                }

                // ✅ Store only the ID from { value: 3, label: "PATANA" }
                case "LOOKUP_DROPDOWN" -> {
                    if (val instanceof Map<?, ?> map) {
                        val = map.get("value"); // discard label, store only ID
                    }
                    if (val instanceof Number) {
                        val = ((Number) val).longValue();
                    }
                    placeholdersList.add("?");
                }

                case "FILE_UPLOAD", "TEXT", "TEXTAREA", "EMAIL", "RADIO", "DROPDOWN" -> {
                    if (val instanceof String strVal && strVal.trim().isEmpty()) val = null;
                    placeholdersList.add("?");
                }

                default -> {
                    if (val instanceof String strVal && strVal.trim().isEmpty()) val = null;
                    placeholdersList.add("?");
                }
            }

            argumentsList.add(val);
        }

        if (columnsList.isEmpty()) {
            throw new RuntimeException("No valid columns provided for insertion.");
        }

        // ── Build and execute INSERT ──────────────────────────────────────────────
        String columns = String.join(", ", columnsList);
        String placeholders = String.join(", ", placeholdersList);
        String sql = "INSERT INTO " + tableName + " (" + columns + ") VALUES (" + placeholders + ")";

        System.out.println("=== INSERT SQL ===");
        System.out.println(sql);
        System.out.println("==================");

        jdbcTemplate.update(sql, argumentsList.toArray());

        // --- Rule Engine Post-save Workflow ---
        ruleEngineService.executePostSubmissionWorkflows(version.getFields(), values);
        // --------------------------------------
    }

    @Transactional(readOnly = true)
    public SubmissionsResponse getSubmissions(Long formId) {

        FormVersion publishedVersion = versionRepository.findByFormIdAndStatus(formId, FormStatusEnum.PUBLISHED)
                .orElseThrow(() -> new RuntimeException("No published version found for this form"));

        String tableName = publishedVersion.getTableName();

        List<FieldDto> columns = publishedVersion.getFields().stream()
                .filter(f -> !"SECTION".equalsIgnoreCase(f.getFieldType())
                        && !"LABEL".equalsIgnoreCase(f.getFieldType()))
                .map(f -> {
                    FieldDto dto = new FieldDto();
                    dto.setFieldKey(f.getFieldKey());
                    dto.setFieldLabel(f.getFieldLabel());
                    dto.setFieldType(f.getFieldType());
                    dto.setRequired(f.getRequired());
                    dto.setFieldOrder(f.getFieldOrder());
                    dto.setConditions(f.getConditions());
                    dto.setOptions(f.getOptions());

                    // ── uiConfig ────────────────────────────────────────────────
                    Map<String, Object> uiConfig = new HashMap<>();
                    if (f.getPlaceholder()        != null) uiConfig.put("placeholder",        f.getPlaceholder());
                    if (f.getHelpText()           != null) uiConfig.put("helpText",           f.getHelpText());
                    if (f.getMaxStars()           != null) uiConfig.put("maxStars",           f.getMaxStars());
                    if (f.getScaleMin()           != null) uiConfig.put("scaleMin",           f.getScaleMin());
                    if (f.getScaleMax()           != null) uiConfig.put("scaleMax",           f.getScaleMax());
                    if (f.getLowLabel()           != null) uiConfig.put("lowLabel",           f.getLowLabel());
                    if (f.getHighLabel()          != null) uiConfig.put("highLabel",          f.getHighLabel());
                    if (f.getMaxFileSizeMb()      != null) uiConfig.put("maxFileSizeMb",      f.getMaxFileSizeMb());
                    if (f.getSourceTable()        != null) uiConfig.put("sourceTable",        f.getSourceTable());
                    if (f.getSourceColumn()       != null) uiConfig.put("sourceColumn",       f.getSourceColumn());
                    if (f.getSourceDisplayColumn()!= null) uiConfig.put("sourceDisplayColumn",f.getSourceDisplayColumn());
                    if (f.getAcceptedFileTypes()  != null && !f.getAcceptedFileTypes().isEmpty())
                        uiConfig.put("acceptedFileTypes", f.getAcceptedFileTypes());
                    dto.setUiConfig(uiConfig);

                    // ── validation ──────────────────────────────────────────────
                    Map<String, Object> validation = new HashMap<>();
                    if (f.getMinLength()  != null) validation.put("minLength", f.getMinLength());
                    if (f.getMaxLength()  != null) validation.put("maxLength", f.getMaxLength());
                    if (f.getMinValue()   != null) validation.put("min",       f.getMinValue());
                    if (f.getMaxValue()   != null) validation.put("max",       f.getMaxValue());
                    if (f.getPattern()    != null) validation.put("pattern",   f.getPattern());
                    if (f.getGridRows()   != null && !f.getGridRows().isEmpty())
                        validation.put("rows",    f.getGridRows());
                    if (f.getGridColumns()!= null && !f.getGridColumns().isEmpty())
                        validation.put("columns", f.getGridColumns());
                    dto.setValidation(validation);

                    return dto;
                })
                .collect(Collectors.toList());

        // ── Build SELECT with JOIN for LOOKUP_DROPDOWN fields ────────────────────
        StringBuilder select = new StringBuilder("SELECT t.id");
        StringBuilder joins  = new StringBuilder();

        for (FormField f : publishedVersion.getFields()) {
            if ("SECTION".equalsIgnoreCase(f.getFieldType()) || "LABEL".equalsIgnoreCase(f.getFieldType())) {
                continue;
            }
            if ("LOOKUP_DROPDOWN".equalsIgnoreCase(f.getFieldType())
                    && f.getSourceTable() != null
                    && f.getSourceColumn() != null) {

                String alias      = "ref_" + f.getFieldKey();
                String displayCol = f.getSourceDisplayColumn() != null
                        ? f.getSourceDisplayColumn()
                        : f.getSourceColumn();

                String sourceTable = f.getSourceTable();

                // SELECT ref_city.name AS city_field_key
                select.append(", ").append(alias).append(".").append(displayCol)
                        .append(" AS ").append(f.getFieldKey());

                // LEFT JOIN form_city_v1 ref_city ON t.city_field_key = ref_city.id
                joins.append(" LEFT JOIN ").append(sourceTable)
                        .append(" ").append(alias)
                        .append(" ON CAST(t.").append(f.getFieldKey())
                        .append(" AS BIGINT) = ").append(alias).append(".").append(f.getSourceColumn());

            } else {
                select.append(", t.").append(f.getFieldKey());
            }
        }

        String sql = select.toString()
                + " FROM " + tableName + " t"
                + joins.toString()
                + " WHERE t.is_delete = false ORDER BY t.id DESC";

        System.out.println("=== SUBMISSIONS SQL ===");
        System.out.println(sql);
        System.out.println("======================");

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
