package com.sttl.formbuilder.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.sttl.formbuilder.dto.FormSummaryDTO;
import com.sttl.formbuilder.dto.PublishedFormDTO;
import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.VersionDto;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.mapper.FieldMapper;
import com.sttl.formbuilder.mapper.FormMapper;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.service.SchemaService;

@Slf4j
@Service
public class FormService {

    private final FormRepository              formRepository;
    private final FormFieldRepository         formFieldRepository;
    private final UserRepository              userRepository;
    private final PermissionService           permissionService;
    private final ModuleAccessService         moduleAccessService;
    private final FormVersionService          formVersionService;
    private final FormSubmissionMetaRepository submissionMetaRepository;
    private final FormVersionRepository       versionRepository;
    private final SchemaService              schemaService;
    private final FormMapper                 formMapper;
    private final FieldMapper                fieldMapper;

    public FormService(FormRepository formRepository,
                       FormFieldRepository formFieldRepository,
                       UserRepository userRepository,
                       PermissionService permissionService,
                       ModuleAccessService moduleAccessService,
                       FormVersionService formVersionService,
                       FormSubmissionMetaRepository submissionMetaRepository,
                       FormVersionRepository versionRepository,
                       SchemaService schemaService,
                       FormMapper formMapper,
                       FieldMapper fieldMapper) {
        this.formRepository      = formRepository;
        this.formFieldRepository = formFieldRepository;
        this.userRepository      = userRepository;
        this.permissionService   = permissionService;
        this.moduleAccessService = moduleAccessService;
        this.formVersionService  = formVersionService;
        this.submissionMetaRepository = submissionMetaRepository;
        this.versionRepository   = versionRepository;
        this.schemaService       = schemaService;
        this.formMapper          = formMapper;
        this.fieldMapper         = fieldMapper;
    }

    /** Returns forms the user has access to manage (Owner or Admin or Builder).
     *  Requires: "Form Vault" module.
     */
    public List<Form> getAllForms(String currentUsername) {
        moduleAccessService.assertHasModule(currentUsername, ModuleAccessService.MODULE_FORM_VAULT);

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (permissionService.canManageSystem(user)) {
            return formRepository.findAll();
        }

        return formRepository.findFormsAccessibleToUser(user);
    }

    /** Returns forms the user has access to manage (Owner or Admin or Builder) - Paginated. */
    public Page<FormSummaryDTO> getFormsPaginated(String currentUsername, Pageable pageable) {
        moduleAccessService.assertHasModule(currentUsername, ModuleAccessService.MODULE_FORM_VAULT);

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        Page<Form> formsPage;
        if (permissionService.canManageSystem(user)) {
            formsPage = formRepository.findAll(pageable);
        } else {
            formsPage = formRepository.findFormsAccessibleToUser(user, pageable);
        }

        return formsPage.map(form -> {
            FormSummaryDTO summary = formMapper.toSummary(form);
            summary.setCanEdit(permissionService.canManageSystem(user) || permissionService.canConfigureForm(user, form));
            summary.setCanViewSubmissions(permissionService.canManageSystem(user) || permissionService.canViewSubmissions(user, form));
            return summary;
        });
    }

    /** Creates a form tagged with the current user as owner.
     *  Requires: "Create New Form" module.
     */
    public Form createForm(CreateFormRequest requestBody, String currentUsername) {
        moduleAccessService.assertHasModule(currentUsername, ModuleAccessService.MODULE_CREATE_FORM);

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (formRepository.existsByCode(requestBody.getCode())) {
            throw new BusinessException("A form with code '" + requestBody.getCode() + "' already exists.", HttpStatus.CONFLICT);
        }
        if (formRepository.existsByNameAndOwner(requestBody.getName(), user)) {
            throw new BusinessException("You already have a form with that name", HttpStatus.CONFLICT);
        }

        Form form = formMapper.toEntity(requestBody);
        form.setCreatedByUsername(currentUsername);
        form.setOwner(user);

        return formRepository.save(form);
    }

    /**
     * Fetches a form's full structure.
     * Pass currentUsername=null for public access (form fill),
     * or a real username to enforce ownership.
     */
    public FormDetailsResponse getFormWithStructure(UUID formId, String currentUsername, String mode) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", org.springframework.http.HttpStatus.NOT_FOUND));

        User user = currentUsername != null ? userRepository.findByUsername(currentUsername).orElse(null) : null;

        log.info("FormService.getFormWithStructure: formId={}, mode={}, visibility={}, user={}",
                formId, mode, form.getVisibility(), (user != null ? user.getUsername() : "ANONYMOUS"));

        if (!permissionService.canViewForm(user, form)) {
            if (user == null) {
                throw new BusinessException("Authentication required to view this form", HttpStatus.UNAUTHORIZED);
            } else {
                throw new BusinessException("You do not have permission to view this form", HttpStatus.FORBIDDEN);
            }
        }

        FormDetailsResponse response = formMapper.toResponse(form);

        // ── SRS §4.3 Schema Drift Detection ──────────────────────────────────
        if (form.getStatus() == FormStatusEnum.PUBLISHED || form.getStatus() == FormStatusEnum.ARCHIVED) {
            FormVersion activeV = formVersionService.getActiveVersion(formId).orElse(null);
            if (activeV != null) {
                List<FormField> activeFields = formFieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(activeV.getId());
                List<String> drift = schemaService.detectDrift(form, activeFields);
                if (!drift.isEmpty()) {
                    throw new BusinessException(
                            "Form has been changed: schema drift detected. Missing columns: " + String.join(", ", drift),
                            HttpStatus.CONFLICT
                    );
                }
            }
        }
        // 2. Resolve appropriate version and Fields
        FormVersion version;
        boolean canEdit = permissionService.canConfigureForm(user, form);
        
        if ("builder".equalsIgnoreCase(mode) && canEdit) {
            // First, try find existing draft
            version = versionRepository.findByFormIdAndIsActiveAndIsDraftWorkingCopy(formId, false, true).orElse(null);
            
            // Fallback to active version if no draft exists — user sees active fields in builder
            if (version == null) {
                version = formVersionService.getActiveVersion(formId).orElse(null);
            }
            
            // If still no version (fresh form), then create initial draft
            if (version == null && currentUsername != null) {
                version = formVersionService.getOrCreateDraftVersion(formId, currentUsername);
            }
        } else {
            version = formVersionService.getActiveVersion(formId).orElse(null);
            // Fallback to draft ONLY if no active version exists and user is owner
            if (version == null && canEdit && currentUsername != null) {
                version = versionRepository.findByFormIdAndIsActiveAndIsDraftWorkingCopy(formId, false, true).orElse(null);
            }
        }

        List<FormField> fields = new ArrayList<>();
        if (version != null) {
            fields = formFieldRepository
                    .findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(version.getId());
        }

        // 3. Populate Version Context
        formVersionService.getActiveVersion(formId).ifPresent(v -> {
            response.setActiveVersionId(v.getId());
            response.setActiveVersionNumber(v.getVersionNumber());
        });
        
        versionRepository.findByFormIdAndIsActiveAndIsDraftWorkingCopy(formId, false, true)
                .ifPresent(dv -> response.setDraftVersionId(dv.getId()));

        response.setCanEdit(canEdit);
        response.setCanViewSubmissions(permissionService.canViewSubmissions(user, form));
        response.setCanDeleteSubmissions(user != null && (permissionService.canManageSystem(user) || permissionService.canDeleteSubmissions(user, form)));
        response.setOwnerName(form.getOwner() != null ? form.getOwner().getUsername() : "Unknown");
        response.setOwnerId(form.getOwner() != null ? form.getOwner().getId() : null);

        // 3. Map Entities to FieldDto using MapStruct
        List<FieldDto> fieldDtos = fields.stream()
                .map(fieldMapper::toDto)
                .collect(Collectors.toList());

        response.setFields(fieldDtos);
        return response;
    }

    public Form archiveForm(UUID formId, String currentUsername) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!permissionService.canConfigureForm(user, form)) {
            throw new RuntimeException("Access denied: only owners or builders can archive");
        }

        form.setStatus(FormStatusEnum.ARCHIVED);
        return formRepository.save(form);
    }

    /**
     * Reactivates an archived form by setting its status back to DRAFT.
     * SRS §11.2: "Archived forms may be reactivated."
     */
    public Form reactivateForm(UUID formId, String currentUsername) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Only the same roles that can archive can reactivate
        if (!permissionService.canArchiveForm(user, form)) {
            throw new RuntimeException("Access denied: you do not have permission to reactivate this form");
        }

        // Guard: only ARCHIVED forms can be reactivated
        if (form.getStatus() != FormStatusEnum.ARCHIVED) {
            throw new RuntimeException("Only archived forms can be reactivated. Current status: " + form.getStatus());
        }

        form.setStatus(FormStatusEnum.DRAFT);
        return formRepository.save(form);
    }

    public List<PublishedFormDTO> getPublishedForms(UUID excludeFormId, String currentUsername) {
        User user = currentUsername != null ? userRepository.findByUsername(currentUsername).orElse(null) : null;

        List<Form> publishedForms = formRepository.findAllByStatus(FormStatusEnum.PUBLISHED);

        return publishedForms.stream()
                .filter(f -> permissionService.canViewForm(user, f))
                .filter(f -> excludeFormId == null || !f.getId().equals(excludeFormId))
                .map(f -> PublishedFormDTO.builder()
                        .formId(f.getId())
                        .formName(f.getName())
                        .tableName(f.getTableName())
                        .fields(formVersionService.getActiveVersion(f.getId())
                                .map(v -> formFieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(v.getId())
                                        .stream()
                                        .map(field -> new PublishedFormDTO.PublishedFormFieldDTO(field.getFieldKey(), field.getFieldLabel()))
                                        .collect(Collectors.toList()))
                                .orElse(List.of()))
                        .build())
                .collect(Collectors.toList());
    }
}