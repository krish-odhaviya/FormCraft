package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FieldValidation;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.UserRepository;
import jakarta.transaction.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.FormRepository;

import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.ValidationRuleDTO;
import com.sttl.formbuilder.dto.internal.FormRuleDTO;
import com.sttl.formbuilder.repository.FieldValidationRepository;

@Service
@RequiredArgsConstructor
public class FormBuilderService {
    private final FormFieldRepository fieldRepository;
    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final FormVersionService formVersionService;
    private final FormSubmissionMetaRepository submissionMetaRepository;
    private final FieldValidationRepository validationRepository;
    private final ObjectMapper                objectMapper;

    private static final Set<String> RESERVED_KEYWORDS = Set.of(
            "SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL",
            "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "OFFSET", "UNION", "DISTINCT",
            "TABLE", "COLUMN", "INDEX", "PRIMARY", "FOREIGN", "KEY", "CONSTRAINT", "REFERENCES",
            "VIEW", "SEQUENCE", "TRIGGER", "USER", "ROLE", "GRANT", "REVOKE"
    );

    public FormField addField(UUID formId, AddFieldRequest request, String currentUsername) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() ->
                        new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied: only owners or builders can modify fields", HttpStatus.FORBIDDEN);
        }

        FormVersion draft = formVersionService.getOrCreateDraftVersion(formId, currentUsername);
        
        if (Boolean.TRUE.equals(draft.getIsActive())) {
             throw new BusinessException("Cannot edit an active version. Create a new version first.", HttpStatus.CONFLICT);
        }
        if (fieldRepository.existsByFormVersionIdAndFieldKeyAndIsDeletedFalse(
                draft.getId(), request.getFieldKey())) {
            throw new BusinessException(
                    "Field already exists",
                    HttpStatus.BAD_REQUEST
            );
        }

        validateFieldKey(request.getFieldKey());

        FormField field = new FormField();
        field.setFormVersion(draft);
        field.setFieldKey(request.getFieldKey());
        field.setParentId(request.getParentId());
        field.setFieldLabel(request.getFieldLabel());
        field.setFieldType(request.getFieldType());
        field.setRequired(request.getRequired());
        field.setFieldOrder(request.getFieldOrder());

        return fieldRepository.save(field);
    }

    @Transactional
    public List<FieldDto> saveDraft(UUID formId, List<AddFieldRequest> fieldRequests, String currentUsername) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied: only owners or builders can save draft", HttpStatus.FORBIDDEN);
        }

        // ── SRS §10 Limits & Guardrails ───────────────────────────────────────
        // Check 1: Max 50 fields per form (every field type counts)
        if (fieldRequests.size() > 50) {
            throw new BusinessException(
                "Form exceeds the maximum of 50 fields. " +
                "Current count: " + fieldRequests.size() + ". " +
                "Please remove " + (fieldRequests.size() - 50) + " field(s) before saving.",
                HttpStatus.BAD_REQUEST
            );
        }

        // Check 2: Max 10 pages/sections per form (PAGE_BREAK + SECTION types combined)
        long pageAndSectionCount = fieldRequests.stream()
            .filter(f -> "PAGE_BREAK".equalsIgnoreCase(f.getFieldType())
                      || "SECTION".equalsIgnoreCase(f.getFieldType()))
            .count();

        if (pageAndSectionCount > 10) {
            throw new BusinessException(
                "Form exceeds the maximum of 10 pages/sections. " +
                "Current count: " + pageAndSectionCount + ". " +
                "Please remove " + (pageAndSectionCount - 10) + " page break(s) or section(s).",
                HttpStatus.BAD_REQUEST
            );
        }

        // Check 3: Max 100 validations per form (each action in conditions.actions[] counts as one)
        int totalValidationCount = 0;
        for (AddFieldRequest req : fieldRequests) {
            if (req.getConditions() == null || req.getConditions().isBlank()) continue;
            try {
                FormRuleDTO rule = objectMapper.readValue(req.getConditions(), FormRuleDTO.class);
                if (rule.getActions() != null) {
                    totalValidationCount += rule.getActions().size();
                }
            } catch (Exception e) {
                // Malformed conditions JSON — skip this field, it will fail later on its own
            }
        }

        if (totalValidationCount > 100) {
            throw new BusinessException(
                "Form exceeds the maximum of 5 validation rules. " +
                "Current count: " + totalValidationCount + ". " +
                "Please remove " + (totalValidationCount - 5) + " validation rule(s) before saving.",
                HttpStatus.BAD_REQUEST
            );
        }

        // 1. Get/Initialize the draft version
        FormVersion draftVersion = formVersionService.getOrCreateDraftVersion(formId, currentUsername);
        if (Boolean.TRUE.equals(draftVersion.getIsActive())) {
            throw new BusinessException("Cannot edit an active version. Create a new version first.", HttpStatus.CONFLICT);
        }

        // 2. Validate incoming field requests for duplicate keys in the same request
        Set<String> seenKeys = new HashSet<>();
        for (AddFieldRequest req : fieldRequests) {
            String key = req.getFieldKey();
            if (key != null) {
                if (!seenKeys.add(key)) {
                    throw new BusinessException("Validation Error: Duplicate field key '" + key + "' found in request.", HttpStatus.BAD_REQUEST);
                }
                validateFieldKey(key);
            }
        }

        // 3. Load existing active fields for this version and map them by ID
        List<FormField> existingFields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(draftVersion.getId());
        Map<UUID, FormField> existingMap = new HashMap<>();
        for (FormField f : existingFields) {
            existingMap.put(f.getId(), f);
        }

        List<FormField> fieldsToSave = new ArrayList<>();
        List<FormField> activeResult = new ArrayList<>();

        // 3. Process the incoming requests (Differential Update)
        for (int i = 0; i < fieldRequests.size(); i++) {
            AddFieldRequest req = fieldRequests.get(i);
            FormField field;

            UUID uuid = tryParseUuid(req.getId());

            // Tie to existing if ID matches
            if (uuid != null && existingMap.containsKey(uuid)) {
                field = existingMap.remove(uuid); // Remove so it don't get deleted
            } else {
                field = new FormField();
                field.setFormVersion(draftVersion);
            }

            // Populate/Update all attributes
            populateFieldFromRequest(field, req, i + 1);
            fieldsToSave.add(field);
            activeResult.add(field);
        }

        // 4. Handle Soft Deletes first and FLUSH to free up the fieldKey constraint
        if (!existingMap.isEmpty()) {
            List<FormField> fieldsToSoftDelete = new ArrayList<>();
            for (FormField removedField : existingMap.values()) {
                removedField.setIsDeleted(true);
                removedField.setFieldKey(removedField.getFieldKey() + "_del_" + System.currentTimeMillis());
                fieldsToSoftDelete.add(removedField);
            }
            fieldRepository.saveAll(fieldsToSoftDelete);
            fieldRepository.flush(); // CRITICAL: Execute these updates now to free up keys
        }

        // 5. Final save for all new/updated fields
        fieldRepository.saveAllAndFlush(fieldsToSave);
        return activeResult.stream()
                .map(FieldDto::fromEntity)
                .collect(Collectors.toList());
    }

    private void populateFieldFromRequest(FormField field, AddFieldRequest req, int order) {
        field.setFieldKey(req.getFieldKey());
        field.setParentId(req.getParentId());
        field.setFieldLabel(req.getFieldLabel());
        field.setFieldType(req.getFieldType());
        field.setRequired(req.getRequired() != null ? req.getRequired() : false);
        field.setConditions(req.getConditions());
        field.setFieldOrder(order);

        // --- Options ---
        if (req.getOptions() != null) {
            field.setOptions(new ArrayList<>(req.getOptions()));
        } else {
            field.setOptions(new ArrayList<>());
        }

        // --- UI Config ---
        if (req.getUiConfig() != null) {
            field.setMaxStars(req.getUiConfig().getMaxStars());
            field.setScaleMin(req.getUiConfig().getScaleMin());
            field.setScaleMax(req.getUiConfig().getScaleMax());
            field.setLowLabel(req.getUiConfig().getLowLabel());
            field.setHighLabel(req.getUiConfig().getHighLabel());
            field.setMaxFileSizeMb(req.getUiConfig().getMaxFileSizeMb());
            field.setSourceTable(req.getUiConfig().getSourceTable());
            field.setSourceColumn(req.getUiConfig().getSourceColumn());
            field.setSourceDisplayColumn(req.getUiConfig().getSourceDisplayColumn());
            field.setSelectionMode(req.getUiConfig().getSelectionMode() != null ? req.getUiConfig().getSelectionMode() : "single");
            field.setMaxSelections(req.getUiConfig().getMaxSelections());
            field.setPlaceholder(req.getUiConfig().getPlaceholder());
            field.setHelpText(req.getUiConfig().getHelpText());
            field.setDefaultValue(req.getUiConfig().getDefaultValue());
            field.setReadOnly(req.getUiConfig().getReadOnly());
            field.setIsHidden(req.getUiConfig().getHidden());

            if (req.getUiConfig().getAcceptedFileTypes() != null) {
                field.getAcceptedFileTypes().clear();
                field.getAcceptedFileTypes().addAll(req.getUiConfig().getAcceptedFileTypes());
            }
        }

        // --- Validation ---
        if (req.getValidation() != null) {
            field.setMinLength(req.getValidation().getMinLength());
            field.setMaxLength(req.getValidation().getMaxLength());
            field.setMinValue(req.getValidation().getMin());
            field.setMaxValue(req.getValidation().getMax());
            field.setPattern(req.getValidation().getPattern());
            field.setValidationMessage(req.getValidation().getValidationMessage());
            field.setIsUnique(req.getValidation().getUnique());
            field.setNumberFormat(req.getValidation().getNumberFormat());

            field.getGridRows().clear();
            if (req.getValidation().getRows() != null) {
                field.getGridRows().addAll(req.getValidation().getRows());
            }

            field.getGridColumns().clear();
            if (req.getValidation().getColumns() != null) {
                field.getGridColumns().addAll(req.getValidation().getColumns());
            }
        }
    }

    private void validateFieldKey(String fieldKey) {
        if (fieldKey == null || fieldKey.trim().isEmpty()) return;
        if (RESERVED_KEYWORDS.contains(fieldKey.toUpperCase().trim())) {
            throw new BusinessException(
                "Invalid field key: '" + fieldKey + "' is a reserved SQL keyword.",
                HttpStatus.BAD_REQUEST
            );
        }
    }

    private UUID tryParseUuid(String id) {
        if (id == null) return null;
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public void reorderFields(UUID formId, ReorderFieldsRequest request, String currentUsername) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied: only owners or builders can reorder fields", HttpStatus.FORBIDDEN);
        }

        if (request.getFieldIds() == null || request.getFieldIds().isEmpty()) {
            throw new BusinessException(
                    "fieldIds is required",
                    HttpStatus.BAD_REQUEST
            );
        }

        FormVersion draft = formVersionService.getOrCreateDraftVersion(formId, currentUsername);
        if (Boolean.TRUE.equals(draft.getIsActive())) {
             throw new BusinessException("Cannot edit an active version. Create a new version first.", HttpStatus.CONFLICT);
        }
        List<FormField> fields =
                fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(draft.getId());

        for (int i = 0; i < request.getFieldIds().size(); i++) {
            UUID id = request.getFieldIds().get(i);
            int order = i + 1;

            fields.stream()
                    .filter(f -> f.getId().equals(id))
                    .findFirst()
                    .ifPresent(f -> f.setFieldOrder(order));
        }

        fieldRepository.saveAll(fields);
    }

    @Transactional
    public List<ValidationRuleDTO> getValidations(UUID formId, String currentUsername) {
        FormVersion draft = formVersionService.getOrCreateDraftVersion(formId, currentUsername);
        return validationRepository.findByFormVersionOrderByExecutionOrderAsc(draft).stream()
                .map(v -> {
                    ValidationRuleDTO dto = new ValidationRuleDTO();
                    dto.setId(v.getId().toString());
                    dto.setScope(v.getScope());
                    dto.setFieldKey(v.getFieldKey());
                    dto.setExpression(v.getExpression());
                    dto.setErrorMessage(v.getErrorMessage());
                    dto.setExecutionOrder(v.getExecutionOrder());
                    return dto;
                }).collect(Collectors.toList());
    }

    @Transactional
    public void saveValidations(UUID formId, List<ValidationRuleDTO> requests, String currentUsername) {
        FormVersion draft = formVersionService.getOrCreateDraftVersion(formId, currentUsername);
        
        // Delete existing for this draft
        validationRepository.deleteByFormVersion(draft);
        
        if (requests == null) return;

        List<FieldValidation> entities = requests.stream().map(req -> {
            FieldValidation v = new FieldValidation();
            v.setFormVersion(draft);
            v.setScope(req.getScope());
            v.setFieldKey(req.getFieldKey());
            v.setExpression(req.getExpression());
            v.setErrorMessage(req.getErrorMessage());
            v.setExecutionOrder(req.getExecutionOrder() != null ? req.getExecutionOrder() : 0);
            return v;
        }).collect(Collectors.toList());

        validationRepository.saveAll(entities);
    }
}