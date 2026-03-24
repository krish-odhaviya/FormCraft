package com.sttl.formbuilder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Snapshots the current field definitions for a form and stores them as a
     * new (inactive) version. This is called during the publish flow.
     *
     * @param formId    ID of the form to snapshot.
     * @param createdBy Username of the publisher.
     * @return the newly created (inactive) {@link FormVersion}.
     */
    @Transactional
    public FormVersion createSnapshot(UUID formId, String createdBy) {
        Form form = formRepository.findByIdWithFields(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        List<FormField> fields = fieldRepository.findByFormIdAndIsDeletedFalseOrderByFieldOrder(formId);
        if (fields.isEmpty()) {
            throw new BusinessException("Cannot create a version with no fields.", HttpStatus.BAD_REQUEST);
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(fields.stream()
                    .map(f -> {
                        // Slim down to only what a renderer needs
                        var node = objectMapper.createObjectNode();
                        node.put("fieldKey",   f.getFieldKey());
                        node.put("fieldLabel", f.getFieldLabel());
                        node.put("fieldType",  f.getFieldType());
                        node.put("required",   Boolean.TRUE.equals(f.getRequired()));
                        node.put("fieldOrder", f.getFieldOrder());
                        if (f.getConditions() != null) node.put("conditions", f.getConditions());
                        if (f.getOptions()    != null) node.set("options", objectMapper.valueToTree(f.getOptions()));
                        return node;
                    })
                    .toList());
        } catch (Exception e) {
            throw new BusinessException("Failed to serialize fields: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }

        long nextVersionNumber = versionRepository.countByFormId(formId) + 1;

        FormVersion version = new FormVersion();
        version.setForm(form);
        version.setVersionNumber((int) nextVersionNumber);
        version.setDefinitionJson(json);
        version.setIsActive(false);
        version.setCreatedBy(createdBy);

        return versionRepository.save(version);
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
    public FormVersion activateVersion(UUID versionId, String username) {
        FormVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new BusinessException("Version not found", HttpStatus.NOT_FOUND));

        // Deactivate all versions for this form first
        versionRepository.deactivateAllVersions(version.getForm().getId());

        version.setIsActive(true);
        version.setActivatedAt(LocalDateTime.now());

        return versionRepository.save(version);
    }
}
