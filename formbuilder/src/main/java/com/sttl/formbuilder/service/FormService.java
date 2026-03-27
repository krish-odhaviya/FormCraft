package com.sttl.formbuilder.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.VersionDto;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.UserRepository;
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
import com.sttl.formbuilder.service.SchemaService;

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

    public FormService(FormRepository formRepository,
                       FormFieldRepository formFieldRepository,
                       UserRepository userRepository,
                       PermissionService permissionService,
                       ModuleAccessService moduleAccessService,
                       FormVersionService formVersionService,
                       FormSubmissionMetaRepository submissionMetaRepository,
                       FormVersionRepository versionRepository,
                       SchemaService schemaService) {
        this.formRepository      = formRepository;
        this.formFieldRepository = formFieldRepository;
        this.userRepository      = userRepository;
        this.permissionService   = permissionService;
        this.moduleAccessService = moduleAccessService;
        this.formVersionService  = formVersionService;
        this.submissionMetaRepository = submissionMetaRepository;
        this.versionRepository   = versionRepository;
        this.schemaService       = schemaService;
    }

    /** Returns forms the user has access to manage (Owner or Admin or Builder).
     *  Requires: "Form Vault" module.
     */
    public List<Form> getAllForms(String currentUsername) {
        moduleAccessService.assertHasModule(currentUsername, ModuleAccessService.MODULE_FORM_VAULT);  // ← ADDED

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (permissionService.canManageSystem(user)) {
            return formRepository.findAll();
        }

        return formRepository.findFormsAccessibleToUser(user);
    }

    /** Returns forms the user has access to manage (Owner or Admin or Builder) - Paginated. */
    public Page<Form> getFormsPaginated(String currentUsername, Pageable pageable) {
        moduleAccessService.assertHasModule(currentUsername, ModuleAccessService.MODULE_FORM_VAULT);

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (permissionService.canManageSystem(user)) {
            return formRepository.findAll(pageable);
        }

        return formRepository.findFormsAccessibleToUser(user, pageable);
    }

    /** Creates a form tagged with the current user as owner.
     *  Requires: "Create New Form" module.
     */
    public Form createForm(String name, String description, String currentUsername) {
        moduleAccessService.assertHasModule(currentUsername, ModuleAccessService.MODULE_CREATE_FORM);

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (formRepository.existsByNameAndOwner(name, user)) {
            throw new BusinessException("You already have a form with that name", HttpStatus.CONFLICT);
        }

        Form form = new Form();
        form.setName(name);
        form.setDescription(description);
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

        System.out.println("FormService.getFormWithStructure: formId=" + formId +
                " mode=" + mode +
                " visibility=" + form.getVisibility() +
                " user=" + (user != null ? user.getUsername() : "ANONYMOUS"));

        if (!permissionService.canViewForm(user, form)) {
            if (user == null) {
                throw new BusinessException("Authentication required to view this form", HttpStatus.UNAUTHORIZED);
            } else {
                throw new BusinessException("You do not have permission to view this form", HttpStatus.FORBIDDEN);
            }
        }

        FormDetailsResponse response = new FormDetailsResponse();
        response.setId(form.getId());
        response.setName(form.getName());
        response.setDescription(form.getDescription());
        response.setCreatedAt(form.getCreatedAt());
        response.setUpdatedAt(form.getUpdatedAt());
        response.setStatus(String.valueOf(form.getStatus()));
        response.setVisibility(form.getVisibility() != null ? form.getVisibility().name() : "PUBLIC");
        response.setTableName(form.getTableName());
        response.setPublishedAt(form.getPublishedAt());

        // ── SRS §4.3 Schema Drift Detection (Initial Access) ─────────────────
        if (form.getStatus() == FormStatusEnum.PUBLISHED || form.getStatus() == FormStatusEnum.ARCHIVED) {
            com.sttl.formbuilder.entity.FormVersion activeV = formVersionService.getActiveVersion(formId).orElse(null);
            if (activeV != null) {
                List<FormField> activeFields = formFieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(activeV.getId());
                List<String> drift = schemaService.detectDrift(form, activeFields);
                if (!drift.isEmpty()) {
                    throw new BusinessException(
                            "Form Unavailable: this form's database structure is out of sync. Missing columns: " + String.join(", ", drift),
                            HttpStatus.CONFLICT
                    );
                }
            }
        }
        // 2. Resolve appropriate version and Fields
        com.sttl.formbuilder.entity.FormVersion version;
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

        // 3. Map Entities to FieldDto with Nested Maps
        List<FieldDto> fieldDtos = fields.stream()
                .map(FieldDto::fromEntity)
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

        form.setStatus(com.sttl.formbuilder.Enums.FormStatusEnum.ARCHIVED);
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
        if (form.getStatus() != com.sttl.formbuilder.Enums.FormStatusEnum.ARCHIVED) {
            throw new RuntimeException("Only archived forms can be reactivated. Current status: " + form.getStatus());
        }

        form.setStatus(com.sttl.formbuilder.Enums.FormStatusEnum.DRAFT);
        return formRepository.save(form);
    }
}