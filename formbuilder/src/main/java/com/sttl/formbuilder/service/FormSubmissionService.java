package com.sttl.formbuilder.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.*;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormSubmissionMeta;
import com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.exception.ValidationException;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sttl.formbuilder.dto.internal.FormRuleDTO;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class FormSubmissionService {

    private final FormRepository formRepository;
    private final JdbcTemplate jdbcTemplate;
    private final RuleEngineService ruleEngineService;
    private final FormSubmissionMetaRepository submissionMetaRepository;
    private final FormVersionRepository formVersionRepository;
    private final FormFieldRepository fieldRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────────────────────────
    // SUBMIT
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void submit(SubmitFormRequest request, String username) {
        UUID formId = request.getFormId();
        Map<String, Object> values = request.getValues();

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        if (values == null || values.isEmpty()) {
            throw new BusinessException("Submission cannot be empty", HttpStatus.BAD_REQUEST);
        }

        FormVersion activeVersion = formVersionRepository.findByFormIdAndIsActive(form.getId(), true)
                .orElseThrow(() -> new BusinessException("No active version found for this form", HttpStatus.CONFLICT));

        if (request.getFormVersionId() != null && !activeVersion.getId().equals(request.getFormVersionId())) {
            throw new BusinessException("Form has been updated. Please reload and resubmit.", HttpStatus.CONFLICT);
        }

        List<FormField> fields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(activeVersion.getId());

        ruleEngineService.validateSubmission(fields, values);

        String tableName = form.getTableName();

        Map<String, String> fieldTypes = new HashMap<>();
        Map<String, FormField> fieldMap = new HashMap<>();

        for (FormField f : fields) {
            if (Boolean.TRUE.equals(f.getIsDeleted())) {
                continue;
            }
            if (List.of("SECTION", "LABEL", "PAGE_BREAK", "GROUP").contains(f.getFieldType())) {
                continue;
            }
            fieldTypes.put(f.getFieldKey(), f.getFieldType());
            fieldMap.put(f.getFieldKey(), f);
        }

        Set<String> allowedKeys = fieldTypes.keySet();
        Map<String, String> errors = new LinkedHashMap<>();

        // ── Required field validation ─────────────────────────────────────────
        for (FormField field : fields) {
            if (Boolean.TRUE.equals(field.getIsDeleted())) continue;
            String key = field.getFieldKey();
            String fieldType = field.getFieldType();
            Object val = values.get(key);
            String label = field.getFieldLabel();

            if (field.getRequired() == null || !field.getRequired()) continue;

            if (field.getConditions() != null && !field.getConditions().trim().isEmpty()) {
                try {
                    FormRuleDTO conds = objectMapper.readValue(field.getConditions(), FormRuleDTO.class);
                    boolean isActive = true;
                    if (conds != null) {
                        boolean rulePasses = ruleEngineService.evaluateRule(conds, values);
                        if ("hide".equalsIgnoreCase(conds.getAction()) && rulePasses) isActive = false;
                        else if ("hide".equalsIgnoreCase(conds.getAction()) && !rulePasses) isActive = true;
                        else if ("show".equalsIgnoreCase(conds.getAction()) && !rulePasses) isActive = false;
                    }
                    if (!isActive) continue;
                } catch (Exception e) {
                    System.err.println("Condition parsing failed for field " + key);
                }
            }

            boolean isEmpty = false;
            if (val == null) isEmpty = true;
            else if (val instanceof String s && s.trim().isEmpty()) isEmpty = true;
            else if (val instanceof List<?> l && l.isEmpty()) isEmpty = true;
            else if (val instanceof Map<?, ?> m && m.isEmpty()) isEmpty = true;
            else if ("STAR_RATING".equalsIgnoreCase(fieldType)) {
                try {
                    if (Integer.parseInt(val.toString()) <= 0) isEmpty = true;
                } catch (NumberFormatException e) {
                    isEmpty = true;
                }
            } else if ("LINEAR_SCALE".equalsIgnoreCase(fieldType)) {
                if (val.toString().trim().isEmpty()) isEmpty = true;
            } else if ("LOOKUP_DROPDOWN".equalsIgnoreCase(fieldType)) {
                if (field.getSelectionMode() != null && field.getSelectionMode().equalsIgnoreCase("multiple")) {
                    if (!(val instanceof List) || ((List<?>) val).isEmpty()) isEmpty = true;
                } else {
                    if (val instanceof Map<?, ?> m && m.get("value") == null) isEmpty = true;
                    else if (val == null) isEmpty = true;
                }
            }

            if (isEmpty) errors.put(key, "'" + label + "' is required.");
        }

        // ── Field-level validation ────────────────────────────────────────────
        for (FormField field : fields) {
            if (Boolean.TRUE.equals(field.getIsDeleted())) continue;
            String key = field.getFieldKey();
            String fieldType = field.getFieldType();
            Object val = values.get(key);
            String label = field.getFieldLabel();

            if (errors.containsKey(key)) continue;
            if (val == null) continue;
            if (val instanceof String s && s.trim().isEmpty()) continue;

            boolean skipValidation = false;
            if (field.getConditions() != null && !field.getConditions().trim().isEmpty()) {
                try {
                    FormRuleDTO conds = objectMapper.readValue(field.getConditions(), FormRuleDTO.class);
                    if (conds != null) {
                        boolean rulePasses = ruleEngineService.evaluateRule(conds, values);
                        if ("hide".equalsIgnoreCase(conds.getAction()) && rulePasses) skipValidation = true;
                        if ("show".equalsIgnoreCase(conds.getAction()) && !rulePasses) skipValidation = true;
                    }
                } catch (Exception e) { /* ignore */ }
            }
            if (skipValidation) continue;

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
                    String fmt = field.getNumberFormat() != null
                            ? field.getNumberFormat().toUpperCase()
                            : "INTEGER";
                    try {
                        double numVal = Double.parseDouble(val.toString());

                        // Whole numbers only
                        if ("INTEGER".equals(fmt) && numVal != Math.floor(numVal)) {
                            errors.put(key, "'" + label + "' must be a whole number (no decimals).");
                            break;
                        }

                        // Min / max (applies to both formats)
                        if (field.getMinValue() != null && numVal < field.getMinValue())
                            errors.put(key, "'" + label + "' must be at least " + field.getMinValue() + ".");
                        else if (field.getMaxValue() != null && numVal > field.getMaxValue())
                            errors.put(key, "'" + label + "' must be at most " + field.getMaxValue() + ".");

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
                case "DROPDOWN", "LOOKUP_DROPDOWN" -> {
                    if (field.getSelectionMode() != null && field.getSelectionMode().equalsIgnoreCase("multiple")) {
                        if (val instanceof List<?> list) {
                            if (field.getMaxSelections() != null && list.size() > field.getMaxSelections()) {
                                errors.put(key, "'" + label + "' accepts at most " + field.getMaxSelections() + " selection(s).");
                            }
                        }
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
                default -> {
                }
            }
        }

        if (!errors.isEmpty()) throw new ValidationException(errors);

        // ── Check if there is an existing draft for this user/form ────────────
        Optional<FormSubmissionMeta> existingDraft = Optional.empty();
        if (username != null) {
            existingDraft = submissionMetaRepository.findByFormIdAndSubmittedByAndStatusAndIsDeletedFalse(
                    formId, username, SubmissionStatus.DRAFT);
        }

        // ── Build columns and arguments ───────────────────────────────────────
        List<String> columnsList = new ArrayList<>();
        List<Object> argumentsList = new ArrayList<>();
        List<String> placeholdersList = new ArrayList<>();

        for (Map.Entry<String, Object> entry : values.entrySet()) {
            String key = entry.getKey();
            Object val = entry.getValue();
            if (!allowedKeys.contains(key)) continue;

            columnsList.add(key);
            String expectedType = fieldTypes.get(key);

            processFieldValue(key, val, expectedType, fieldMap, placeholdersList, argumentsList);

            FormField field = fieldMap.get(key);
            if (field != null && Boolean.TRUE.equals(field.getIsUnique()) && val != null) {
                String sqlCheck = "SELECT count(*) FROM " + tableName + " WHERE " + key + " = ? AND is_delete = false";
                if (existingDraft.isPresent()) {
                    sqlCheck += " AND id <> ?";
                }
                Integer count;
                if (existingDraft.isPresent()) {
                    count = jdbcTemplate.queryForObject(sqlCheck, Integer.class, val, existingDraft.get().getDataRowId());
                } else {
                    count = jdbcTemplate.queryForObject(sqlCheck, Integer.class, val);
                }
                if (count != null && count > 0) {
                    errors.put(key, "'" + field.getFieldLabel() + "' must be unique. This value already exists.");
                }
            }
        }

        if (!errors.isEmpty()) throw new ValidationException(errors);

        if (columnsList.isEmpty()) throw new BusinessException("No valid columns provided.", HttpStatus.BAD_REQUEST);

        UUID dataRowId;
        if (existingDraft.isPresent()) {
            // ── UPDATE existing draft ───────────────────────────────────────
            dataRowId = existingDraft.get().getDataRowId();
            StringBuilder updateSql = new StringBuilder("UPDATE ").append(tableName).append(" SET ");
            for (int i = 0; i < columnsList.size(); i++) {
                updateSql.append(columnsList.get(i)).append(" = ").append(placeholdersList.get(i));
                if (i < columnsList.size() - 1) updateSql.append(", ");
            }
            updateSql.append(", is_draft = ?, form_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            argumentsList.add(false);
            argumentsList.add(activeVersion.getId());
            argumentsList.add(dataRowId);
            jdbcTemplate.update(updateSql.toString(), argumentsList.toArray());

            // ── Update Meta ────────────────────────────────────────────────
            FormSubmissionMeta meta = existingDraft.get();
            meta.setStatus(SubmissionStatus.SUBMITTED);
            meta.setFormVersion(activeVersion);
            meta.setSubmittedAt(LocalDateTime.now());
            submissionMetaRepository.save(meta);
        } else {
            // ── INSERT new submission ───────────────────────────────────────
            columnsList.add("is_draft");
            placeholdersList.add("?");
            argumentsList.add(false);

            columnsList.add("form_version_id");
            placeholdersList.add("?");
            argumentsList.add(activeVersion.getId());

            String sql = "INSERT INTO " + tableName
                    + " (" + String.join(", ", columnsList) + ")"
                    + " VALUES (" + String.join(", ", placeholdersList) + ") RETURNING id";

            dataRowId = jdbcTemplate.queryForObject(sql, java.util.UUID.class, argumentsList.toArray());

            // ── Write to form_submission_meta ────────────────────────────────
            FormSubmissionMeta meta = new FormSubmissionMeta();
            meta.setForm(form);
            meta.setFormVersion(activeVersion);
            meta.setStatus(SubmissionStatus.SUBMITTED);
            meta.setDataRowId(dataRowId);
            meta.setSubmittedAt(LocalDateTime.now());
            meta.setSubmittedBy(username);
            submissionMetaRepository.save(meta);
        }

        ruleEngineService.executePostSubmissionWorkflows(fields, values);
    }

    private void processFieldValue(String key, Object val, String expectedType, Map<String, FormField> fieldMap,
                                   List<String> placeholdersList, List<Object> argumentsList) {
        
        // Handle null or empty strings early—these should be stored as DB NULL and use standard '?' placeholder.
        // This prevents "invalid input syntax for type json" errors when casting empty strings to JSONB.
        if (val == null || (val instanceof String s && s.trim().isEmpty())) {
            argumentsList.add(null);
            placeholdersList.add("?");
            return;
        }

        switch (expectedType.toUpperCase()) {
            case "DATE" -> {
                if (val instanceof String s) val = s.trim().isEmpty() ? null : LocalDate.parse(s.trim());
                placeholdersList.add("?");
            }
            case "TIME" -> {
                if (val instanceof String s) val = s.trim().isEmpty() ? null : LocalTime.parse(s.trim());
                placeholdersList.add("?");
            }
            case "INTEGER" -> {
                FormField numField = fieldMap.get(key);
                String fmt = (numField != null && numField.getNumberFormat() != null)
                        ? numField.getNumberFormat().toUpperCase()
                        : "INTEGER";
                if (val instanceof String s) {
                    if (s.trim().isEmpty()) val = null;
                    else if ("INTEGER".equals(fmt)) val = (long) Double.parseDouble(s.trim());
                    else val = Double.parseDouble(s.trim());
                } else if (val instanceof Number n) {
                    val = "INTEGER".equals(fmt) ? n.longValue() : n.doubleValue();
                }
                placeholdersList.add("?");
            }
            case "STAR_RATING", "LINEAR_SCALE" -> {
                if (val instanceof String s) val = s.trim().isEmpty() ? null : Integer.parseInt(s.trim());
                else if (val instanceof Number n) val = n.intValue();
                placeholdersList.add("?");
            }
            case "BOOLEAN" -> {
                if (val instanceof String s) val = Boolean.parseBoolean(s.trim());
                placeholdersList.add("?");
            }
            case "CHECKBOX_GROUP" -> {
                if (val instanceof List) {
                    try { val = objectMapper.writeValueAsString(val); }
                    catch (JsonProcessingException e) { throw new RuntimeException("Failed to serialize checkbox: " + key); }
                }
                placeholdersList.add("?");
            }
            case "MC_GRID", "TICK_BOX_GRID" -> {
                if (val instanceof Map) {
                    try { val = objectMapper.writeValueAsString(val); }
                    catch (JsonProcessingException e) { throw new RuntimeException("Failed to serialize grid: " + key); }
                }
                placeholdersList.add("?::jsonb");
            }
            case "LOOKUP_DROPDOWN" -> {
                FormField f = fieldMap.get(key);
                boolean isMultiple = f != null && "multiple".equalsIgnoreCase(f.getSelectionMode());
                if (isMultiple) {
                    if (val instanceof List<?> list) {
                        try {
                            List<Map<String, Object>> valuesToStore = list.stream()
                                    .map(item -> {
                                        if (item instanceof Map<?, ?> map) {
                                            return Map.of("value", map.get("value"), "label", map.get("label"));
                                        }
                                        return Map.of("value", item, "label", item);
                                    })
                                    .filter(Objects::nonNull)
                                    .collect(Collectors.toList());
                            val = objectMapper.writeValueAsString(valuesToStore);
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Failed to serialize lookup: " + key);
                        }
                    }
                    placeholdersList.add("?::jsonb");
                } else {
                    if (val instanceof Map<?, ?> map) val = map.get("value");
                    if (val instanceof String s && !s.trim().isEmpty()) {
                        try { val = UUID.fromString(s.trim()); } catch(Exception e) { /* keep as string if not uuid */ }
                    }
                    placeholdersList.add("?");
                }
            }
            case "DROPDOWN" -> {
                FormField f = fieldMap.get(key);
                if (f != null && "multiple".equalsIgnoreCase(f.getSelectionMode())) {
                    if (val instanceof List) {
                        try { val = objectMapper.writeValueAsString(val); }
                        catch (JsonProcessingException e) { throw new RuntimeException("Failed to serialize dropdown: " + key); }
                    }
                    placeholdersList.add("?::jsonb");
                } else {
                    placeholdersList.add("?");
                }
            }
            default -> {
                if (val instanceof String s && s.trim().isEmpty()) val = null;
                placeholdersList.add("?");
            }
        }
        argumentsList.add(val);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DRAFT SAVE / GET
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public java.util.UUID saveDraft(DraftRequest request, String username) {
        if (username == null) throw new BusinessException("User must be authenticated to save a draft", HttpStatus.UNAUTHORIZED);

        UUID formId = request.getFormId();
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        FormVersion version = formVersionRepository.findById(request.getFormVersionId())
                .orElseThrow(() -> new BusinessException("Version not found", HttpStatus.NOT_FOUND));

        // Structural validation: check unknown fields
        List<FormField> activeFields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(version.getId());
        Set<String> allowedKeys = activeFields.stream()
                .filter(f -> !List.of("SECTION", "LABEL", "PAGE_BREAK", "GROUP").contains(f.getFieldType()))
                .map(FormField::getFieldKey)
                .collect(Collectors.toSet());

        Map<String, Object> values = request.getData();
        if (values != null) {
            for (String key : values.keySet()) {
                if (!allowedKeys.contains(key)) throw new BusinessException("Unknown field: " + key, HttpStatus.BAD_REQUEST);
            }
        }

        Optional<FormSubmissionMeta> existingMeta = submissionMetaRepository.findByFormIdAndSubmittedByAndStatusAndIsDeletedFalse(
                formId, username, SubmissionStatus.DRAFT);

        String tableName = form.getTableName();
        Map<String, String> fieldTypes = activeFields.stream()
                .filter(f -> allowedKeys.contains(f.getFieldKey()))
                .collect(Collectors.toMap(FormField::getFieldKey, FormField::getFieldType));
        Map<String, FormField> fieldMap = activeFields.stream().collect(Collectors.toMap(FormField::getFieldKey, f -> f));

        List<String> columnsList = new ArrayList<>();
        List<Object> argumentsList = new ArrayList<>();
        List<String> placeholdersList = new ArrayList<>();

        if (values != null) {
            for (Map.Entry<String, Object> entry : values.entrySet()) {
                String key = entry.getKey();
                Object val = entry.getValue();
                columnsList.add(key);
                processFieldValue(key, val, fieldTypes.get(key), fieldMap, placeholdersList, argumentsList);
            }
        }

        UUID dataRowId;
        if (existingMeta.isPresent()) {
            dataRowId = existingMeta.get().getDataRowId();
            StringBuilder sql = new StringBuilder("UPDATE ").append(tableName).append(" SET ");
            for (int i = 0; i < columnsList.size(); i++) {
                sql.append(columnsList.get(i)).append(" = ").append(placeholdersList.get(i));
                if (i < columnsList.size() - 1) sql.append(", ");
            }
            if (!columnsList.isEmpty()) sql.append(", ");
            sql.append("form_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            argumentsList.add(version.getId());
            argumentsList.add(dataRowId);
            jdbcTemplate.update(sql.toString(), argumentsList.toArray());

            FormSubmissionMeta meta = existingMeta.get();
            meta.setFormVersion(version);
            submissionMetaRepository.save(meta);
        } else {
            columnsList.add("is_draft");
            placeholdersList.add("?");
            argumentsList.add(true);

            columnsList.add("form_version_id");
            placeholdersList.add("?");
            argumentsList.add(version.getId());

            String sql = "INSERT INTO " + tableName + " (" + String.join(", ", columnsList) + ") VALUES (" 
                    + String.join(", ", placeholdersList) + ") RETURNING id";
            dataRowId = jdbcTemplate.queryForObject(sql, UUID.class, argumentsList.toArray());

            FormSubmissionMeta meta = new FormSubmissionMeta();
            meta.setForm(form);
            meta.setFormVersion(version);
            meta.setStatus(SubmissionStatus.DRAFT);
            meta.setDataRowId(dataRowId);
            meta.setSubmittedBy(username);
            submissionMetaRepository.save(meta);
        }
        return dataRowId;
    }

    @Transactional(readOnly = true)
    public DraftResponse getDraft(UUID formId, String username) {
        if (username == null) return null;

        Optional<FormSubmissionMeta> metaOpt = submissionMetaRepository.findByFormIdAndSubmittedByAndStatusAndIsDeletedFalse(
                formId, username, SubmissionStatus.DRAFT);

        if (metaOpt.isEmpty()) return null;

        FormSubmissionMeta meta = metaOpt.get();
        Form form = meta.getForm();
        FormVersion version = meta.getFormVersion();

        List<FormField> fields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(version.getId());
        String dataSql = buildSelectSql(fields, form.getTableName()) + " WHERE id = ?";
        Map<String, Object> data = jdbcTemplate.queryForMap(dataSql, meta.getDataRowId());
        
        // Remove system columns from returned data
        data.remove("id");
        data.remove("created_at");
        data.remove("updated_at");
        data.remove("is_draft");
        data.remove("form_version_id");
        data.remove("is_delete");

        DraftResponse res = new DraftResponse();
        res.setSubmissionId(meta.getDataRowId());
        res.setFormVersionId(version.getId());
        res.setData(data);
        res.setStatus("DRAFT");
        return res;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHARED HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build FieldDto list from published version fields
     */
    private List<FieldDto> buildColumnDtos(List<FormField> fields) {
        return fields.stream()
                .filter(f -> !"SECTION".equalsIgnoreCase(f.getFieldType())
                        && !"LABEL".equalsIgnoreCase(f.getFieldType())
                        && !"PAGE_BREAK".equalsIgnoreCase(f.getFieldType())
                        && !"GROUP".equalsIgnoreCase(f.getFieldType())
                )
                .map(f -> {
                    FieldDto dto = new FieldDto();
                    dto.setFieldKey(f.getFieldKey());
                    dto.setFieldLabel(f.getFieldLabel());
                    dto.setFieldType(f.getFieldType());
                    dto.setRequired(f.getRequired());
                    dto.setFieldOrder(f.getFieldOrder());
                    dto.setConditions(f.getConditions());
                    dto.setOptions(f.getOptions());

                    Map<String, Object> uiConfig = new HashMap<>();
                    if (f.getPlaceholder() != null) uiConfig.put("placeholder", f.getPlaceholder());
                    if (f.getHelpText() != null) uiConfig.put("helpText", f.getHelpText());
                    if (f.getDefaultValue() != null) uiConfig.put("defaultValue", f.getDefaultValue());
                    if (f.getReadOnly() != null) uiConfig.put("readOnly", f.getReadOnly());
                    if (f.getMaxStars() != null) uiConfig.put("maxStars", f.getMaxStars());
                    if (f.getScaleMin() != null) uiConfig.put("scaleMin", f.getScaleMin());
                    if (f.getScaleMax() != null) uiConfig.put("scaleMax", f.getScaleMax());
                    if (f.getLowLabel() != null) uiConfig.put("lowLabel", f.getLowLabel());
                    if (f.getHighLabel() != null) uiConfig.put("highLabel", f.getHighLabel());
                    if (f.getMaxFileSizeMb() != null) uiConfig.put("maxFileSizeMb", f.getMaxFileSizeMb());
                    if (f.getSourceTable() != null) uiConfig.put("sourceTable", f.getSourceTable());
                    if (f.getSourceColumn() != null) uiConfig.put("sourceColumn", f.getSourceColumn());
                    if (f.getSourceDisplayColumn() != null)
                        uiConfig.put("sourceDisplayColumn", f.getSourceDisplayColumn());
                    if (f.getAcceptedFileTypes() != null && !f.getAcceptedFileTypes().isEmpty())
                        uiConfig.put("acceptedFileTypes", f.getAcceptedFileTypes());
                    if (f.getSelectionMode() != null) uiConfig.put("selectionMode", f.getSelectionMode());
                    if (f.getMaxSelections() != null) uiConfig.put("maxSelections", f.getMaxSelections());
                    dto.setUiConfig(uiConfig);

                    Map<String, Object> validation = new HashMap<>();
                    if (f.getMinLength() != null) validation.put("minLength", f.getMinLength());
                    if (f.getMaxLength() != null) validation.put("maxLength", f.getMaxLength());
                    if (f.getMinValue() != null) validation.put("min", f.getMinValue());
                    if (f.getMaxValue() != null) validation.put("max", f.getMaxValue());
                    if (f.getPattern() != null) validation.put("pattern", f.getPattern());
                    if (f.getGridRows() != null && !f.getGridRows().isEmpty()) validation.put("rows", f.getGridRows());
                    if (f.getGridColumns() != null && !f.getGridColumns().isEmpty())
                        validation.put("columns", f.getGridColumns());
                    dto.setValidation(validation);

                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Build SELECT + JOIN SQL for lookup fields
     */
    private String buildSelectSql(List<FormField> fields, String tableName) {
        StringBuilder select = new StringBuilder("SELECT t.id");
        StringBuilder joins = new StringBuilder();

        for (FormField f : fields) {
            if ("SECTION".equalsIgnoreCase(f.getFieldType())
                    || "LABEL".equalsIgnoreCase(f.getFieldType())
                    || "PAGE_BREAK".equalsIgnoreCase(f.getFieldType())
                    || "GROUP".equalsIgnoreCase(f.getFieldType())

            ) continue;

            if ("LOOKUP_DROPDOWN".equalsIgnoreCase(f.getFieldType())
                    && f.getSourceTable() != null && f.getSourceColumn() != null) {
                if ("multiple".equalsIgnoreCase(f.getSelectionMode())) {
                    select.append(", CAST(t.").append(f.getFieldKey()).append(" AS TEXT) AS ").append(f.getFieldKey());
                } else {
                    String alias = "ref_" + f.getFieldKey();
                    String displayCol = f.getSourceDisplayColumn() != null
                            ? f.getSourceDisplayColumn() : f.getSourceColumn();
                    select.append(", ").append(alias).append(".").append(displayCol)
                            .append(" AS ").append(f.getFieldKey());
                    joins.append(" LEFT JOIN ").append(f.getSourceTable()).append(" ").append(alias)
                            .append(" ON CAST(t.").append(f.getFieldKey()).append(" AS TEXT) = CAST(")
                            .append(alias).append(".").append(f.getSourceColumn()).append(" AS TEXT)");
                }
            } else if ("MC_GRID".equalsIgnoreCase(f.getFieldType()) || "TICK_BOX_GRID".equalsIgnoreCase(f.getFieldType())) {
                select.append(", CAST(t.").append(f.getFieldKey()).append(" AS TEXT) AS ").append(f.getFieldKey());
            } else {
                select.append(", t.").append(f.getFieldKey());
            }
        }

        return select.toString() + " FROM " + tableName + " t" + joins.toString();
    }

    /**
     * Build JOIN-only SQL (used for COUNT query)
     */
    private String buildJoinsOnly(List<FormField> fields) {
        StringBuilder joins = new StringBuilder();
        for (FormField f : fields) {
            if ("LOOKUP_DROPDOWN".equalsIgnoreCase(f.getFieldType())
                    && f.getSourceTable() != null && f.getSourceColumn() != null 
                    && !"multiple".equalsIgnoreCase(f.getSelectionMode())) {
                String alias = "ref_" + f.getFieldKey();
                joins.append(" LEFT JOIN ").append(f.getSourceTable()).append(" ").append(alias)
                        .append(" ON CAST(t.").append(f.getFieldKey()).append(" AS TEXT) = CAST(")
                        .append(alias).append(".").append(f.getSourceColumn()).append(" AS TEXT)");
            }
        }
        return joins.toString();
    }

    /**
     * Build WHERE clause — always filters deleted rows, optionally applies search
     */
    private String buildWhere(List<FormField> fields, String search, UUID versionId) {
        StringBuilder where = new StringBuilder(" WHERE t.is_delete = false");
        
        if (versionId != null) {
            where.append(" AND t.form_version_id = '").append(versionId).append("'");
        }

        if (search == null || search.trim().isEmpty()) {
            return where.toString();
        }

        String safe = search.trim().replace("'", "''");

        List<String> conditions = fields.stream()
                .filter(f -> !"SECTION".equalsIgnoreCase(f.getFieldType())
                        && !"LABEL".equalsIgnoreCase(f.getFieldType())
                        && !"PAGE_BREAK".equalsIgnoreCase(f.getFieldType())
                        && !"GROUP".equalsIgnoreCase(f.getFieldType())
                        && !"MC_GRID".equalsIgnoreCase(f.getFieldType())
                        && !"TICK_BOX_GRID".equalsIgnoreCase(f.getFieldType())
                        && !"BOOLEAN".equalsIgnoreCase(f.getFieldType())
                        && !"FILE_UPLOAD".equalsIgnoreCase(f.getFieldType()))
                .map(f -> {
                    if ("LOOKUP_DROPDOWN".equalsIgnoreCase(f.getFieldType())) {
                        boolean isMultiple = "multiple".equalsIgnoreCase(f.getSelectionMode());
                        if (isMultiple) {
                            return "CAST(t." + f.getFieldKey() + " AS TEXT) ILIKE '%" + safe + "%'";
                        }
                        String alias = "ref_" + f.getFieldKey();
                        String displayCol = f.getSourceDisplayColumn() != null
                                ? f.getSourceDisplayColumn() : f.getSourceColumn();
                        return "CAST(" + alias + "." + displayCol + " AS TEXT) ILIKE '%" + safe + "%'";
                    }
                    return "CAST(t." + f.getFieldKey() + " AS TEXT) ILIKE '%" + safe + "%'";
                })
                .collect(Collectors.toList());

        conditions.add("CAST(t.id AS TEXT) ILIKE '%" + safe + "%'");

        if (conditions.isEmpty()) return where.toString();

        where.append(" AND (").append(String.join(" OR ", conditions)).append(")");
        return where.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET SUBMISSIONS — PAGINATED (uses Spring Pageable)
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public PagedSubmissionsResponse getSubmissionsPaged(java.util.UUID formId, String search, java.util.UUID versionId, Pageable pageable) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        if (form.getStatus() != FormStatusEnum.PUBLISHED && form.getStatus() != FormStatusEnum.ARCHIVED) {
            throw new BusinessException("Form is not in a state that allows viewing submissions", HttpStatus.BAD_REQUEST);
        }

        String tableName = form.getTableName();

        // ── Resolve version ──────────────────────────────────────────────────
        FormVersion targetVersion;
        if (versionId != null) {
            targetVersion = formVersionRepository.findById(versionId)
                    .orElseThrow(() -> new BusinessException("Version not found", HttpStatus.NOT_FOUND));
            if (!targetVersion.getForm().getId().equals(formId)) {
                throw new BusinessException("Version does not belong to this form", HttpStatus.BAD_REQUEST);
            }
        } else {
            targetVersion = formVersionRepository.findByFormIdAndIsActive(formId, true)
                    .orElseThrow(() -> new BusinessException("No active version found", HttpStatus.NOT_FOUND));
        }

        List<FormField> fields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(targetVersion.getId());

        // ── Valid field keys (to prevent SQL injection on sort column) ─────────
        Set<String> validKeys = fields.stream()
                .map(FormField::getFieldKey)
                .collect(Collectors.toSet());
        validKeys.add("id");
        validKeys.add("created_at");

        // ── Extract pagination values from Pageable ───────────────────────────
        int page = pageable.getPageNumber();   // 0-based
        int size = pageable.getPageSize();
        long offset = pageable.getOffset();      // page * size

        // ── Extract sort from Pageable ────────────────────────────────────────
        String orderCol = "created_at";
        String orderDir = "DESC";

        if (pageable.getSort().isSorted()) {
            Sort.Order order = pageable.getSort().iterator().next();
            // Only allow sorting on known field keys — prevents SQL injection
            if (validKeys.contains(order.getProperty())) {
                orderCol = order.getProperty();
                orderDir = order.isAscending() ? "ASC" : "DESC";
            }
        }

        // ── Build SQL parts ───────────────────────────────────────────────────
        String selectSql = buildSelectSql(fields, tableName);
        String whereSql = buildWhere(fields, search, versionId);
        String orderSql = " ORDER BY t." + orderCol + " " + orderDir;

        // ── COUNT query (for totalElements) ───────────────────────────────────
        String countSql = "SELECT COUNT(*) FROM " + tableName + " t"
                + buildJoinsOnly(fields) + whereSql;

        Long totalElements = jdbcTemplate.queryForObject(countSql, Long.class);
        if (totalElements == null) totalElements = 0L;

        long totalPages = size > 0 ? (long) Math.ceil((double) totalElements / size) : 0;

        // ── Data query (current page only) ────────────────────────────────────
        String dataSql = selectSql + whereSql + orderSql
                + " LIMIT " + size + " OFFSET " + offset;

        System.out.println("=== PAGEABLE SUBMISSIONS SQL ===");
        System.out.println("Page: " + page + " | Size: " + size + " | Offset: " + offset);
        System.out.println("Sort: " + orderCol + " " + orderDir);
        System.out.println(dataSql);
        System.out.println("================================");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(dataSql);

        PagedSubmissionsResponse response = new PagedSubmissionsResponse();
        response.setColumns(buildColumnDtos(fields));
        response.setRows(rows);
        response.setTotalElements(totalElements);
        response.setTotalPages(totalPages);
        response.setPage(page);
        response.setSize(size);
        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXPORT — all matching rows (no pagination)
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public SubmissionsResponse exportSubmissions(java.util.UUID formId, String search, java.util.UUID versionId) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        if (form.getStatus() != FormStatusEnum.PUBLISHED && form.getStatus() != FormStatusEnum.ARCHIVED) {
            throw new BusinessException("Form is not in a state that allows exporting submissions", HttpStatus.BAD_REQUEST);
        }

        String tableName = form.getTableName();

        FormVersion targetVersion;
        if (versionId != null) {
            targetVersion = formVersionRepository.findById(versionId)
                    .orElseThrow(() -> new BusinessException("Version not found", HttpStatus.NOT_FOUND));
        } else {
            targetVersion = formVersionRepository.findByFormIdAndIsActive(formId, true)
                    .orElseThrow(() -> new BusinessException("No active version found", HttpStatus.NOT_FOUND));
        }
        
        List<FormField> fields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(targetVersion.getId());

        String sql = buildSelectSql(fields, tableName)
                + buildWhere(fields, search, versionId)
                + " ORDER BY t.id DESC";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);

        SubmissionsResponse response = new SubmissionsResponse();
        response.setColumns(buildColumnDtos(fields));
        response.setRows(rows);
        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOFT DELETE
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void softDeleteSubmission(java.util.UUID formId, java.util.UUID submissionId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        if (form.getStatus() != FormStatusEnum.PUBLISHED && form.getStatus() != FormStatusEnum.ARCHIVED) {
            throw new BusinessException("Form is not in a state that allows deleting submissions", HttpStatus.BAD_REQUEST);
        }
        jdbcTemplate.update(
                "UPDATE " + form.getTableName() + " SET is_delete = true WHERE id = ?",
                submissionId
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BULK SOFT DELETE
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void softDeleteSubmissionsBulk(java.util.UUID formId, List<java.util.UUID> submissionIds) {
        if (submissionIds == null || submissionIds.isEmpty()) return;

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        if (form.getStatus() != FormStatusEnum.PUBLISHED && form.getStatus() != FormStatusEnum.ARCHIVED) {
            throw new BusinessException("Form is not in a state that allows bulk deleting submissions", HttpStatus.BAD_REQUEST);
        }

        String placeholders = String.join(",", Collections.nCopies(submissionIds.size(), "?"));
        String sql = "UPDATE " + form.getTableName() + " SET is_delete = true WHERE id IN (" + placeholders + ")";

        jdbcTemplate.update(sql, submissionIds.toArray());
    }
}