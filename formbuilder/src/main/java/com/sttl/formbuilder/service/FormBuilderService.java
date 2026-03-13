package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormFieldRepository;
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

@Service
@RequiredArgsConstructor
public class FormBuilderService {
    private final FormFieldRepository fieldRepository;
    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public FormField addField(Long formId, AddFieldRequest request, String currentUsername) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() ->
                        new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied: only owners or builders can modify fields", HttpStatus.FORBIDDEN);
        }

        if (fieldRepository.existsByFormIdAndFieldKeyAndIsDeletedFalse(
                formId, request.getFieldKey())) {

            throw new BusinessException(
                    "Field already exists",
                    HttpStatus.BAD_REQUEST
            );
        }

        FormField field = new FormField();
        field.setForm(form);
        field.setFieldKey(request.getFieldKey());
        field.setParentId(request.getParentId());
        field.setFieldLabel(request.getFieldLabel());
        field.setFieldType(request.getFieldType());
        field.setRequired(request.getRequired());
        field.setFieldOrder(request.getFieldOrder());

        return fieldRepository.save(field);
    }

    @Transactional
    public void saveDraft(Long formId, List<AddFieldRequest> fieldRequests, String currentUsername) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied: only owners or builders can save draft", HttpStatus.FORBIDDEN);
        }

        // Soft delete all existing fields for a fresh update
        List<FormField> existingFields = fieldRepository.findByFormIdAndIsDeletedFalseOrderByFieldOrder(formId);
        for(FormField f: existingFields) {
            f.setIsDeleted(true);
            // Append a unique suffix to the fieldKey to avoid unique constraint violation on (form_id, field_key)
            // while preserving the original key in some form if needed (though it's usually just for column mapping).
            String suffix = "_del_" + System.currentTimeMillis();
            if (f.getFieldKey().length() + suffix.length() > 100) {
                f.setFieldKey(f.getFieldKey().substring(0, 100 - suffix.length()) + suffix);
            } else {
                f.setFieldKey(f.getFieldKey() + suffix);
            }
        }
        fieldRepository.saveAll(existingFields);
        fieldRepository.flush();

        for (int i = 0; i < fieldRequests.size(); i++) {
            AddFieldRequest req = fieldRequests.get(i);

            FormField field = new FormField();

            field.setForm(form);

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
                if (field.getOptions() == null) {
                    field.setOptions(new ArrayList<>());
                }
                field.getOptions().addAll(req.getOptions());
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

            // --- Map Grid rows/columns from validation ---
            if (req.getValidation() != null) {
                field.setMinLength(req.getValidation().getMinLength());
                field.setMaxLength(req.getValidation().getMaxLength());
                field.setMinValue(req.getValidation().getMin());
                field.setMaxValue(req.getValidation().getMax());
                field.setPattern(req.getValidation().getPattern());
                field.setValidationMessage(req.getValidation().getValidationMessage());
                field.setIsUnique(req.getValidation().getUnique());

                if (req.getValidation().getRows() != null) {
                    field.getGridRows().addAll(req.getValidation().getRows());
                }
                if (req.getValidation().getColumns() != null) {
                    field.getGridColumns().addAll(req.getValidation().getColumns());
                }
            }

            form.getFields().add(field);
        }

        formRepository.save(form);
    }

    public void reorderFields(Long formId, ReorderFieldsRequest request, String currentUsername) {
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

        List<FormField> fields =
                fieldRepository.findByFormIdAndIsDeletedFalseOrderByFieldOrder(formId);

        for (int i = 0; i < request.getFieldIds().size(); i++) {
            Long id = request.getFieldIds().get(i);
            int order = i + 1;

            fields.stream()
                    .filter(f -> f.getId().equals(id))
                    .findFirst()
                    .ifPresent(f -> f.setFieldOrder(order));
        }

        fieldRepository.saveAll(fields);
    }
}
