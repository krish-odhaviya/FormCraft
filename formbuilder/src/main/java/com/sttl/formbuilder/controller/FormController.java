package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.constant.ApiEndpoints;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.service.FormService;
import com.sttl.formbuilder.service.FormVersionService;
import com.sttl.formbuilder.repository.FormFieldRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import com.sttl.formbuilder.dto.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import com.sttl.formbuilder.Enums.FormRole;
import com.sttl.formbuilder.Enums.VisibilityType;
import com.sttl.formbuilder.entity.FormPermission;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.FormPermissionRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.PermissionService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiEndpoints.FORMS_BASE)
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;
    private final FormRepository formRepository;
    private final PermissionService permissionService;
    private final FormVersionService formVersionService;
    private final FormFieldRepository formFieldRepository;
    private final UserRepository userRepository;
    private final FormPermissionRepository permissionRepository;

    // ── GET /api/forms — Paginated form list ───────
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<Map<String, Object>>>> getAllForms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Sort sort = sortDir.equalsIgnoreCase("asc") 
            ? Sort.by(sortBy).ascending() 
            : Sort.by(sortBy).descending();
            
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Form> formsPage = 
            formService.getFormsPaginated(currentUser.getUsername(), pageable);

        User user = userRepository.findByUsername(currentUser.getUsername()).orElse(null);

        List<Map<String, Object>> content = formsPage.getContent().stream().map(form -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", form.getId());
            map.put("code", form.getCode());
            map.put("name", form.getName());
            map.put("description", form.getDescription());
            map.put("createdAt", form.getCreatedAt());
            map.put("updatedAt", form.getUpdatedAt());
            map.put("status", form.getStatus().name());
            map.put("visibility", form.getVisibility() != null ? form.getVisibility().name() : "PUBLIC");
            map.put("ownerUsername", form.getOwner() != null ? form.getOwner().getUsername() : null);
            map.put("canEdit", user != null && (permissionService.canManageSystem(user) || permissionService.canConfigureForm(user, form)));
            map.put("canViewSubmissions", user != null && (permissionService.canManageSystem(user) || permissionService.canViewSubmissions(user, form)));
            return map;
        }).collect(Collectors.toList());

        PagedResponse<Map<String, Object>> pagedResponse = 
            PagedResponse.<Map<String, Object>>builder()
                .content(content)
                .page(formsPage.getNumber())
                .size(formsPage.getSize())
                .totalElements(formsPage.getTotalElements())
                .totalPages(formsPage.getTotalPages())
                .last(formsPage.isLast())
                .build();

        return ApiResponseUtil.success(pagedResponse, "Forms fetched successfully", request);
    }

    // ── GET /api/forms/{formId} — ownership enforced ──────────────────────────
    @GetMapping("/{formId}")
    public ResponseEntity<ApiResponse<FormDetailsResponse>> getForm(
            @PathVariable UUID formId,
            @RequestParam(required = false) String mode,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        String username = currentUser != null ? currentUser.getUsername() : null;
        FormDetailsResponse response = formService.getFormWithStructure(formId, username, mode);
        return ApiResponseUtil.success(response, "Form fetched successfully", request);
    }

    // ── GET /api/forms/code/{code} — public form view by form code ────────────
    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<FormDetailsResponse>> getFormByCode(
            @PathVariable String code,
            @RequestParam(required = false) String mode,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        String username = currentUser != null ? currentUser.getUsername() : null;
        Form form = formRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException(
                        "Form not found for code: " + code, HttpStatus.NOT_FOUND));
        FormDetailsResponse response = formService.getFormWithStructure(form.getId(), username, mode);
        return ApiResponseUtil.success(response, "Form fetched successfully", request);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Form>> createForm(
            @Valid @RequestBody CreateFormRequest requestBody,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = userRepository.findByUsername(currentUser.getUsername()).orElse(null);
        if (user == null || !permissionService.canCreateForm(user)) {
            return ApiResponseUtil.error("Access Denied: You do not have permission to create forms", null, HttpStatus.FORBIDDEN, request);
        }

        Form form = formService.createForm(
                requestBody.getName(),
                requestBody.getCode(),
                requestBody.getDescription(),
                currentUser.getUsername()
        );
        return ApiResponseUtil.success(form, "Form created successfully", request);
    }


    @GetMapping(ApiEndpoints.PUBLISHED_LIST)
    public ResponseEntity<?> getPublishedForms(
            @RequestParam(required = false) UUID excludeFormId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        // Note: For Anonymous users, currentUser will be null. 
        // We should allow them to see PUBLIC forms.
        User user = currentUser != null ? userRepository.findByUsername(currentUser.getUsername()).orElse(null) : null;

        List<Form> publishedForms = formRepository.findAllByStatus(FormStatusEnum.PUBLISHED);

        List<Map<String, Object>> result = publishedForms.stream()
                .filter(f -> permissionService.canViewForm(user, f))
                .filter(f -> excludeFormId == null || !f.getId().equals(excludeFormId))
                .map(f -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("formId", f.getId());
                    m.put("formName", f.getName());
                    m.put("tableName", f.getTableName());
                    
                    List<Map<String, String>> fieldOptions = formVersionService.getActiveVersion(f.getId())
                            .map(v -> formFieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(v.getId())
                                    .stream()
                                    .map(field -> Map.of("key", field.getFieldKey(), "label", field.getFieldLabel()))
                                    .collect(Collectors.toList()))
                            .orElse(List.of());
                                    
                    m.put("fields", fieldOptions);
                    return m;
                })
                .collect(Collectors.toList());

        return ApiResponseUtil.success(result, "Published forms", request);
    }

    @PostMapping("/{formId}" + ApiEndpoints.ARCHIVE)
    public ResponseEntity<?> archiveForm(
            @PathVariable UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Unauthorized", null, HttpStatus.UNAUTHORIZED, request);
        }

        User user = userRepository.findByUsername(currentUser.getUsername()).orElse(null);
        Form formToArchive = formRepository.findById(formId).orElse(null);

        if (formToArchive == null) {
            return ApiResponseUtil.error("Form not found", null, HttpStatus.NOT_FOUND, request);
        }
        if (!permissionService.canArchiveForm(user, formToArchive)) {
            return ApiResponseUtil.error("Access Denied: You do not have permission to archive this form", null, HttpStatus.FORBIDDEN, request);
        }

        try {
            Form form = formService.archiveForm(formId, currentUser.getUsername());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", form.getId());
            result.put("status", form.getStatus().name());
            result.put("updatedAt", form.getUpdatedAt());
            return ApiResponseUtil.success(result, "Form archived successfully", request);
        } catch (Exception e) {
            return ApiResponseUtil.error(e.getMessage(), null, HttpStatus.BAD_REQUEST, request);
        }
    }

    /**
     * POST /api/forms/{formId}/reactivate
     * Reactivates an archived form — sets status back to DRAFT.
     * SRS §11.2: "Archived forms may be reactivated."
     */
    @PostMapping("/{formId}" + ApiEndpoints.REACTIVATE)
    public ResponseEntity<?> reactivateForm(
            @PathVariable java.util.UUID formId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails currentUser,
            jakarta.servlet.http.HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Authentication required", null,
                    HttpStatus.UNAUTHORIZED, request);
        }

        User user = userRepository.findByUsername(currentUser.getUsername()).orElse(null);
        Form formToReactivate = formRepository.findById(formId).orElse(null);

        if (formToReactivate == null) {
            return ApiResponseUtil.error("Form not found", null,
                    HttpStatus.NOT_FOUND, request);
        }

        if (!permissionService.canArchiveForm(user, formToReactivate)) {
            return ApiResponseUtil.error(
                    "Access Denied: You do not have permission to reactivate this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        try {
            Form form = formService.reactivateForm(formId, currentUser.getUsername());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", form.getId());
            result.put("status", form.getStatus().name());
            result.put("updatedAt", form.getUpdatedAt());
            return ApiResponseUtil.success(result, "Form reactivated successfully", request);
        } catch (RuntimeException e) {
            return ApiResponseUtil.error(e.getMessage(), null,
                    HttpStatus.BAD_REQUEST, request);
        }
    }

    // ── POST /api/forms/{formId}/visibility ──────────────────────────────────
    @PostMapping("/{formId}" + ApiEndpoints.VISIBILITY)
    public ResponseEntity<?> updateVisibility(
            @PathVariable UUID formId,
            @RequestParam VisibilityType visibility,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Unauthorized", null, HttpStatus.UNAUTHORIZED, request);
        }

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        User user = userRepository.findByUsername(currentUser.getUsername()).orElseThrow();

        if (!permissionService.isOwnerOrAdmin(user, form)) {
            return ApiResponseUtil.error("Access denied: only owner or admin can change visibility", null, HttpStatus.FORBIDDEN, request);
        }

        form.setVisibility(visibility);
        formRepository.save(form);

        return ApiResponseUtil.success(null, "Visibility updated successfully", request);
    }


    // ── GET /api/forms/{formId}/permissions ──────────────────────────────────
    @GetMapping("/{formId}" + ApiEndpoints.PERMISSIONS)
    public ResponseEntity<?> getPermissions(
            @PathVariable UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("Session user not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.isOwnerOrAdmin(user, form)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, request);
        }

        List<FormPermission> permissions = permissionRepository.findByForm(form);
        List<Map<String, Object>> result = permissions.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("userId", p.getUser().getId());
            m.put("username", p.getUser().getUsername());
            m.put("role", p.getRole().name());
            m.put("grantedAt", p.getGrantedAt());
            return m;
        }).collect(Collectors.toList());

        return ApiResponseUtil.success(result, "Permissions fetched", request);
    }

    // ── POST /api/forms/{formId}/permissions ─────────────────────────────────
    @PostMapping("/{formId}" + ApiEndpoints.PERMISSIONS)
    public ResponseEntity<?> addPermission(
            @PathVariable UUID formId,
            @RequestParam String username,
            @RequestParam FormRole role,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
        User grantor = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("Session user not found", HttpStatus.UNAUTHORIZED));

        if (!permissionService.isOwnerOrAdmin(grantor, form)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, request);
        }

        User targetUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found: " + username, HttpStatus.NOT_FOUND));

        permissionService.grantFormRole(grantor, targetUser, form, role, null);

        return ApiResponseUtil.success(null, "Permission granted", request);
    }

    // ── DELETE /api/forms/{formId}/permissions/{permissionId} ────────────────
    @DeleteMapping("/{formId}" + ApiEndpoints.PERMISSIONS + "/{permissionId}")
    public ResponseEntity<?> removePermission(
            @PathVariable UUID formId,
            @PathVariable UUID permissionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        User user = userRepository.findByUsername(currentUser.getUsername()).orElseThrow();

        if (!permissionService.isOwnerOrAdmin(user, form)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, request);
        }

        permissionRepository.deleteById(permissionId);

        return ApiResponseUtil.success(null, "Permission removed", request);
    }
}