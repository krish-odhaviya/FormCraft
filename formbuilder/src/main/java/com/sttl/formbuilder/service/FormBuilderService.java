package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.FormRepository;

import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FormBuilderService {
    private final FormFieldRepository fieldRepository;
    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final FormVersionService formVersionService;
    private final FormSubmissionMetaRepository submissionMetaRepository;

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
    public void saveDraft(UUID formId, List<AddFieldRequest> fieldRequests, String currentUsername) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied: only owners or builders can save draft", HttpStatus.FORBIDDEN);
        }

        // Architecture Decision: Preparation of NEXT version
        FormVersion draftVersion = formVersionService.getOrCreateDraftVersion(formId, currentUsername);

        // Guard: never allow saving to an active version (Task 3.3 Rule)
        if (Boolean.TRUE.equals(draftVersion.getIsActive())) {
            throw new BusinessException("Cannot edit an active version. Create a new version to make changes.", HttpStatus.CONFLICT);
        }

        // Soft delete all existing fields for THIS draft version exclusively
        List<FormField> existingFields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(draftVersion.getId());
        for(FormField f: existingFields) {
            f.setIsDeleted(true);
            f.setFieldKey(f.getFieldKey() + "_del_" + System.currentTimeMillis());
        }
        fieldRepository.saveAll(existingFields);
        fieldRepository.flush();

        List<FormField> newFields = new ArrayList<>();
        for (int i = 0; i < fieldRequests.size(); i++) {
            AddFieldRequest req = fieldRequests.get(i);
            FormField field = new FormField();
            field.setFormVersion(draftVersion);

            // --- Basic Fields ---
            field.setFieldKey(req.getFieldKey());
            field.setParentId(req.getParentId());
            field.setFieldLabel(req.getFieldLabel());
            field.setFieldType(req.getFieldType());
            field.setRequired(req.getRequired() != null ? req.getRequired() : false);
            field.setConditions(req.getConditions());
            field.setFieldOrder(i + 1);

            // --- Handle Options ---
            if (req.getOptions() != null && !req.getOptions().isEmpty()) {
                field.setOptions(new ArrayList<>(req.getOptions()));
            }

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
                field.setPlaceholder(req.getUiConfig().getPlaceholder());
                field.setHelpText(req.getUiConfig().getHelpText());
                field.setDefaultValue(req.getUiConfig().getDefaultValue());
                field.setReadOnly(req.getUiConfig().getReadOnly());
                field.setIsHidden(req.getUiConfig().getHidden());

                if (req.getUiConfig().getAcceptedFileTypes() != null) {
                    field.getAcceptedFileTypes().addAll(req.getUiConfig().getAcceptedFileTypes());
                }
            }

            if (req.getValidation() != null) {
                field.setMinLength(req.getValidation().getMinLength());
                field.setMaxLength(req.getValidation().getMaxLength());
                field.setMinValue(req.getValidation().getMin());
                field.setMaxValue(req.getValidation().getMax());
                field.setPattern(req.getValidation().getPattern());
                field.setValidationMessage(req.getValidation().getValidationMessage());
                field.setIsUnique(req.getValidation().getUnique());
                field.setNumberFormat(req.getValidation().getNumberFormat());

                if (req.getValidation().getRows() != null) {
                    field.getGridRows().addAll(req.getValidation().getRows());
                }
                if (req.getValidation().getColumns() != null) {
                    field.getGridColumns().addAll(req.getValidation().getColumns());
                }
            }
            newFields.add(field);
        }
        fieldRepository.saveAll(newFields);
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
}