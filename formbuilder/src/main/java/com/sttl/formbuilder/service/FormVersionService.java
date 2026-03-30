package com.sttl.formbuilder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.dto.ActivateVersionResult;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages the lifecycle of {@link FormVersion} records.
 *
 * <ul>
 *   <li>Creating a version snapshot at publish time.</li>
 *   <li>Activating a version (only one active per form).</li>
 *   <li>Retrieving versions.</li>
 * </ul>
 *
 * <strong>Immutability rule:</strong> Once a version is ACTIVE, its
 * {@code definitionJson} must never change. Any field edits on the parent
 * {@link Form} create a new draft that can then be published as version N+1.
 */
@Service
@RequiredArgsConstructor
public class FormVersionService {

    private final FormVersionRepository versionRepository;
    private final FormRepository formRepository;
    private final FormFieldRepository fieldRepository;
    private final FieldValidationRepository validationRepository;
    private final FormSubmissionMetaRepository submissionMetaRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    // ── Read ──────────────────────────────────────────────────────────────────

    public List<FormVersion> getVersions(UUID formId) {
        return versionRepository.findByFormIdOrderByVersionNumberDesc(formId);
    }

    public FormVersion getVersionById(UUID versionId) {
        return versionRepository.findById(versionId)
                .orElseThrow(() -> new BusinessException("Version not found", HttpStatus.NOT_FOUND));
    }

    public Optional<FormVersion> getActiveVersion(UUID formId) {
        return versionRepository.findByFormIdAndIsActive(formId, true);
    }

    @Transactional
    public FormVersion getOrCreateDraftVersion(UUID formId, String username) {
        return versionRepository.findByFormIdAndIsActiveAndIsDraftWorkingCopy(formId, false, true)
                .orElseGet(() -> {
                    Form form = formRepository.findById(formId)
                            .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

                    Integer maxVer = versionRepository.findMaxVersionNumberByFormId(formId);
                    int nextVer = (maxVer == null) ? 1 : maxVer + 1;

                    FormVersion v = new FormVersion();
                    v.setForm(form);
                    v.setVersionNumber(nextVer);
                    v.setIsActive(false);
                    v.setIsDraftWorkingCopy(true);
                    v.setCreatedBy(username);
                    v.setCreatedAt(LocalDateTime.now());
                    v.setDefinitionJson("[]"); // placeholder
                    FormVersion saved = versionRepository.save(v);
                    
                    // Architecture Requirement: Start from active version if it exists
                    getActiveVersion(formId).ifPresent(active -> cloneFields(active, saved));
                    
                    return saved;
                });
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Snapshots the current field definitions for a form and stores them as a
     * new (inactive) version. This is called during the publish flow.
     *
     * @param formId    ID of the form to snapshot.
     * @param createdBy Username of the publisher.
     * @return the newly created (inactive) {@link FormVersion}.
     */
    /**
     * Snapshots the current field definitions for a version and stores them in definitionJson.
     */
    @Transactional
    public void updateDefinitionJson(FormVersion version) {
        List<FormField> fields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(version.getId());
        if (fields.isEmpty()) {
            throw new BusinessException("Cannot publish a version with no fields.", HttpStatus.BAD_REQUEST);
        }
        version.setDefinitionJson(generateDefinitionJson(fields));
        versionRepository.save(version);
    }

    public String generateDefinitionJson(List<FormField> fields) {
        try {
            return objectMapper.writeValueAsString(fields.stream()
                    .map(f -> {
                        var node = objectMapper.createObjectNode();
                        node.put("fieldKey",   f.getFieldKey());
                        node.put("fieldLabel", f.getFieldLabel());
                        node.put("fieldType",  f.getFieldType());
                        node.put("required",   Boolean.TRUE.equals(f.getRequired()));
                        node.put("fieldOrder", f.getFieldOrder());
                        if (f.getParentId()   != null) node.put("parentId", f.getParentId());
                        if (f.getConditions() != null) node.put("conditions", f.getConditions());
                        if (f.getOptions()    != null && !f.getOptions().isEmpty()) node.set("options", objectMapper.valueToTree(f.getOptions()));
                        
                        var ui = node.putObject("uiConfig");
                        if (f.getPlaceholder() != null) ui.put("placeholder", f.getPlaceholder());
                        if (f.getHelpText() != null) ui.put("helpText", f.getHelpText());
                        if (f.getDefaultValue() != null) ui.put("defaultValue", f.getDefaultValue());
                        if (f.getReadOnly() != null) ui.put("readOnly", f.getReadOnly());
                        if (f.getIsHidden() != null) ui.put("hidden", f.getIsHidden());
                        if (f.getMaxStars() != null) ui.put("maxStars", f.getMaxStars());
                        if (f.getScaleMin() != null) ui.put("scaleMin", f.getScaleMin());
                        if (f.getScaleMax() != null) ui.put("scaleMax", f.getScaleMax());
                        if (f.getLowLabel() != null) ui.put("lowLabel", f.getLowLabel());
                        if (f.getHighLabel() != null) ui.put("highLabel", f.getHighLabel());
                        if (f.getMaxFileSizeMb() != null) ui.put("maxFileSizeMb", f.getMaxFileSizeMb());
                        if (f.getAcceptedFileTypes() != null && !f.getAcceptedFileTypes().isEmpty()) ui.set("acceptedFileTypes", objectMapper.valueToTree(f.getAcceptedFileTypes()));
                        if (f.getSourceTable() != null) ui.put("sourceTable", f.getSourceTable());
                        if (f.getSourceColumn() != null) ui.put("sourceColumn", f.getSourceColumn());
                        if (f.getSourceDisplayColumn() != null) ui.put("sourceDisplayColumn", f.getSourceDisplayColumn());
                        if (f.getSelectionMode() != null) ui.put("selectionMode", f.getSelectionMode());
                        if (f.getMaxSelections() != null) ui.put("maxSelections", f.getMaxSelections());

                        var val = node.putObject("validation");
                        if (f.getMinLength() != null) val.put("minLength", f.getMinLength());
                        if (f.getMaxLength() != null) val.put("maxLength", f.getMaxLength());
                        if (f.getMinValue() != null) val.put("min", f.getMinValue());
                        if (f.getMaxValue() != null) val.put("max", f.getMaxValue());
                        if (f.getPattern() != null) val.put("pattern", f.getPattern());
                        if (f.getValidationMessage() != null) val.put("validationMessage", f.getValidationMessage());
                        if (f.getIsUnique() != null) val.put("unique", f.getIsUnique());
                        if (f.getNumberFormat() != null) val.put("numberFormat", f.getNumberFormat());
                        if (f.getGridRows() != null && !f.getGridRows().isEmpty()) val.set("rows", objectMapper.valueToTree(f.getGridRows()));
                        if (f.getGridColumns() != null && !f.getGridColumns().isEmpty()) val.set("columns", objectMapper.valueToTree(f.getGridColumns()));

                        return node;
                    })
                    .toList());
        } catch (Exception e) {
            throw new BusinessException("Failed to serialize fields: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public void cloneFields(FormVersion source, FormVersion target) {
        List<FormField> sourceFields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(source.getId());
        List<FormField> newFields = sourceFields.stream().map(f -> {
            FormField nf = new FormField();
            nf.setFormVersion(target);
            nf.setFieldKey(f.getFieldKey());
            nf.setParentId(f.getParentId());
            nf.setFieldLabel(f.getFieldLabel());
            nf.setFieldType(f.getFieldType());
            nf.setRequired(f.getRequired());
            nf.setFieldOrder(f.getFieldOrder());
            nf.setOptions(new ArrayList<>(f.getOptions()));
            nf.setMaxStars(f.getMaxStars());
            nf.setScaleMin(f.getScaleMin());
            nf.setScaleMax(f.getScaleMax());
            nf.setLowLabel(f.getLowLabel());
            nf.setHighLabel(f.getHighLabel());
            nf.setAcceptedFileTypes(new ArrayList<>(f.getAcceptedFileTypes()));
            nf.setMaxFileSizeMb(f.getMaxFileSizeMb());
            nf.setGridRows(new ArrayList<>(f.getGridRows()));
            nf.setGridColumns(new ArrayList<>(f.getGridColumns()));
            nf.setConditions(f.getConditions());
            nf.setSourceTable(f.getSourceTable());
            nf.setSourceColumn(f.getSourceColumn());
            nf.setSourceDisplayColumn(f.getSourceDisplayColumn());
            nf.setPlaceholder(f.getPlaceholder());
            nf.setHelpText(f.getHelpText());
            nf.setDefaultValue(f.getDefaultValue());
            nf.setReadOnly(f.getReadOnly());
            nf.setIsHidden(f.getIsHidden());
            nf.setMinLength(f.getMinLength());
            nf.setMaxLength(f.getMaxLength());
            nf.setMinValue(f.getMinValue());
            nf.setMaxValue(f.getMaxValue());
            nf.setPattern(f.getPattern());
            nf.setValidationMessage(f.getValidationMessage());
            nf.setIsUnique(f.getIsUnique());
            nf.setNumberFormat(f.getNumberFormat());
            nf.setSelectionMode(f.getSelectionMode());
            nf.setMaxSelections(f.getMaxSelections());
            return nf;
        }).toList();
        fieldRepository.saveAll(newFields);

        // Also clone FieldValidations
        List<com.sttl.formbuilder.entity.FieldValidation> sourceValidations = 
            validationRepository.findByFormVersionOrderByExecutionOrderAsc(source);
        
        List<com.sttl.formbuilder.entity.FieldValidation> targetValidations = sourceValidations.stream().map(v -> {
            com.sttl.formbuilder.entity.FieldValidation tv = new com.sttl.formbuilder.entity.FieldValidation();
            tv.setFormVersion(target);
            tv.setScope(v.getScope());
            tv.setFieldKey(v.getFieldKey());
            tv.setExpression(v.getExpression());
            tv.setErrorMessage(v.getErrorMessage());
            tv.setExecutionOrder(v.getExecutionOrder());
            return tv;
        }).toList();
        validationRepository.saveAll(targetValidations);
    }

    // ── Activate ──────────────────────────────────────────────────────────────

    /**
     * Activates a specific version and deactivates all others for the same form.
     * This is an atomic, transactional operation.
     *
     * @param versionId ID of the version to activate.
     * @param username  Username performing the activation.
     * @return the activated {@link FormVersion}.
     */
    @Transactional
    public ActivateVersionResult activateVersion(UUID versionId, String username) {
        FormVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new BusinessException("Version not found", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(version.getIsActive())) {
            throw new BusinessException("This version is already active", HttpStatus.CONFLICT);
        }

        UUID formId = version.getForm().getId();

        // Deactivate all versions for this form first
        versionRepository.deactivateAllVersions(formId);

        // SRS: Drop drafts when activating a new version
        int draftsDropped = submissionMetaRepository.deleteAllDraftsByFormId(formId);
        String tableName = version.getForm().getTableName();
        if (tableName != null) {
            try {
                // Also clean up per-form table rows that are marked as draft
                jdbcTemplate.update("DELETE FROM " + tableName + " WHERE is_draft = true");
            } catch (Exception e) {
                // Table might not exist yet if never published/synced, ignore
            }
        }

        version.setIsActive(true);
        version.setIsDraftWorkingCopy(false);
        version.setActivatedAt(LocalDateTime.now());
        versionRepository.save(version);

        return new ActivateVersionResult(version, draftsDropped);
    }
}
