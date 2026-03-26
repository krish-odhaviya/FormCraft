package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.ActivateVersionResult;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.FormVersionService;
import com.sttl.formbuilder.service.PermissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST API for managing form versions.
 * Endpoints:
 GET  /api/forms/{formId}/versions       — list all versions</li>
 GET  /api/forms/{formId}/versions/{id}  — get a single version</li>
 POST /api/forms/{formId}/versions        — create snapshot (draft → new version)</li>
 POST /api/forms/{formId}/versions/{id}/activate — activate a version</li>

 */
@RestController
@RequestMapping("/forms/{formId}/versions")
@RequiredArgsConstructor
public class FormVersionController {

    private final FormVersionService formVersionService;
    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    // ── GET /api/forms/{formId}/versions ─────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> listVersions(
            @PathVariable java.util.UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canConfigureForm(user, form) && !permissionService.canManageSystem(user)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, request);
        }

        List<FormVersion> versions = formVersionService.getVersions(formId);
        List<Map<String, Object>> result = versions.stream().map(this::toMap).collect(Collectors.toList());

        return ApiResponseUtil.success(result, "Versions fetched", request);
    }

    // ── GET /api/forms/{formId}/versions/{versionId} ─────────────────────────
    @GetMapping("/{versionId}")
    public ResponseEntity<?> getVersion(
            @PathVariable java.util.UUID formId,
            @PathVariable java.util.UUID versionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canConfigureForm(user, form) && !permissionService.canManageSystem(user)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, request);
        }

        FormVersion version = formVersionService.getVersionById(versionId);
        if (!version.getForm().getId().equals(formId)) {
            return ApiResponseUtil.error("Version does not belong to this form", null, HttpStatus.NOT_FOUND, request);
        }

        return ApiResponseUtil.success(toMap(version), "Version fetched", request);
    }

    // ── POST /api/forms/{formId}/versions ────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createVersion(
            @PathVariable java.util.UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canConfigureForm(user, form) && !permissionService.canManageSystem(user)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, request);
        }

        try {
            FormVersion version = formVersionService.getOrCreateDraftVersion(formId, currentUser.getUsername());
            return ApiResponseUtil.success(toMap(version), "Draft version created/resolved", request);
        } catch (BusinessException e) {
            return ApiResponseUtil.error(e.getMessage(), null, e.getStatus(), request);
        }
    }

    // ── POST /api/forms/{formId}/versions/{versionId}/activate ───────────────
    @PostMapping("/{versionId}/activate")
    public ResponseEntity<?> activateVersion(
            @PathVariable java.util.UUID formId,
            @PathVariable java.util.UUID versionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.isOwnerOrAdmin(user, form)) {
            return ApiResponseUtil.error("Access denied: only owner or admin can activate versions",
                    null, HttpStatus.FORBIDDEN, request);
        }

        try {
            ActivateVersionResult result = formVersionService.activateVersion(versionId, currentUser.getUsername());
            Map<String, Object> response = toMap(result.getVersion());
            response.put("draftsDropped", result.getDraftsDropped());
            return ApiResponseUtil.success(response, "Version activated", request);
        } catch (BusinessException e) {
            return ApiResponseUtil.error(e.getMessage(), null, e.getStatus(), request);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(FormVersion v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            v.getId());
        m.put("versionNumber", v.getVersionNumber());
        m.put("isActive",      v.getIsActive());
        m.put("isDraftWorkingCopy", v.getIsDraftWorkingCopy());
        m.put("createdBy",     v.getCreatedBy());
        m.put("createdAt",     v.getCreatedAt());
        m.put("activatedAt",   v.getActivatedAt());
        m.put("definitionJson", v.getDefinitionJson());
        return m;
    }

    private Form resolveForm(java.util.UUID formId) {
        return formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
    }

    private User resolveUser(UserDetails currentUser) {
        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }
}
