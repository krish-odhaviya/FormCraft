package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormFieldRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;

import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VersionService {

    private final FormFieldRepository fieldRepository;
    private final FormVersionRepository versionRepository;
    private final FormRepository formRepository;


    public FormVersion createDraftVersion(Long formId) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        int nextVersion = versionRepository.countByFormId(formId) + 1;

        FormVersion version = new FormVersion();
        version.setForm(form);
        version.setVersionNumber(nextVersion);
        version.setStatus(FormStatusEnum.DRAFT);

        return versionRepository.save(version);
    }

    public FormField addField(Long versionId, AddFieldRequest request) {

        FormVersion version = versionRepository.findById(versionId)
                .orElseThrow(() ->
                        new BusinessException("Version not found", HttpStatus.NOT_FOUND));

        if (version.getStatus() != FormStatusEnum.DRAFT) {
            throw new BusinessException(
                    "Cannot modify published version",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (fieldRepository.existsByVersionIdAndFieldKey(
                versionId, request.getFieldKey())) {

            throw new BusinessException(
                    "Field already exists",
                    HttpStatus.BAD_REQUEST
            );
        }

        FormField field = new FormField();
        field.setVersion(version);
        field.setFieldKey(request.getFieldKey());
        field.setFieldLabel(request.getFieldLabel());
        field.setFieldType(request.getFieldType());
        field.setRequired(request.getRequired());
        field.setFieldOrder(request.getFieldOrder());

        return fieldRepository.save(field);
    }


    public void saveDraft(Long versionId, List<AddFieldRequest> fieldRequests) {
        FormVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        // 1. Clear existing fields to avoid primary key/unique constraint conflicts
        version.getFields().clear();
        versionRepository.flush();

        for (int i = 0; i < fieldRequests.size(); i++) {
            AddFieldRequest req = fieldRequests.get(i);

            FormField field = new FormField();

            // --- CRITICAL: Link the version so version_id is not null ---
            field.setVersion(version);

            // --- Basic Fields ---
            field.setFieldKey(req.getFieldKey());
            field.setFieldLabel(req.getFieldLabel());
            field.setFieldType(req.getFieldType());
            field.setRequired(req.getRequired() != null ? req.getRequired() : false);
            field.setFieldOrder(i + 1);

            // --- Handle Options (THE FIX for Radio/Checkbox) ---
            if (req.getOptions() != null && !req.getOptions().isEmpty()) {
                // Safely initialize the list if it's null to prevent NullPointerException
                if (field.getOptions() == null) {
                    field.setOptions(new ArrayList<>());
                }
                field.getOptions().addAll(req.getOptions());
            }

            if (req.getUiConfig() != null) {
                // ... your existing mappings ...
                field.setMaxStars(req.getUiConfig().getMaxStars());
                field.setScaleMin(req.getUiConfig().getScaleMin());
                field.setScaleMax(req.getUiConfig().getScaleMax());
                field.setLowLabel(req.getUiConfig().getLowLabel());
                field.setHighLabel(req.getUiConfig().getHighLabel());
                field.setMaxFileSizeMb(req.getUiConfig().getMaxFileSizeMb());

                if (req.getUiConfig().getAcceptedFileTypes() != null) {
                    field.getAcceptedFileTypes().addAll(req.getUiConfig().getAcceptedFileTypes());
                }
            }

// --- Map Grid rows/columns from validation ---
            if (req.getValidation() != null) {
                // ... your existing mappings ...
                if (req.getValidation().getRows() != null) {
                    field.getGridRows().addAll(req.getValidation().getRows());
                }
                if (req.getValidation().getColumns() != null) {
                    field.getGridColumns().addAll(req.getValidation().getColumns());
                }
            }

            version.getFields().add(field);
        }

        versionRepository.save(version);
    }

    public void reorderFields(Long versionId,
                              ReorderFieldsRequest request) {

        if (request.getFieldIds() == null || request.getFieldIds().isEmpty()) {
            throw new BusinessException(
                    "fieldIds is required",
                    HttpStatus.BAD_REQUEST
            );
        }

        List<FormField> fields =
                fieldRepository.findByVersionIdOrderByFieldOrder(versionId);

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