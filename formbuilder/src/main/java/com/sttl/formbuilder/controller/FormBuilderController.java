package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.FormBuilderService;
import com.sttl.formbuilder.service.PermissionService;
import com.sttl.formbuilder.service.SchemaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@Validated
@RequiredArgsConstructor
public class FormBuilderController {

    private final FormBuilderService formBuilderService;
    private final SchemaService schemaService;
    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    /**
     * POST /api/forms/{formId}/fields
     * Adds a new field to a form draft.
     */
    @PostMapping("/api/forms/{formId}/fields")
    public ResponseEntity<ApiResponse<FormField>> addField(
            @PathVariable Long formId,
            @Valid @RequestBody AddFieldRequest requestBody,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        FormField field = formBuilderService.addField(formId, requestBody, currentUser.getUsername());
        return ApiResponseUtil.success(field, "Field added successfully", request);
    }

    /**
     * GET /api/forms/{formId}/fields
     * Returns all active (non-deleted) fields for a form.
     */
    @GetMapping("/api/forms/{formId}/fields")
    public ResponseEntity<ApiResponse<List<FormField>>> getFormFields(
            @PathVariable Long formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = formRepository.findByIdWithFields(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        List<FormField> fields = form.getFields().stream()
                .filter(f -> !f.getIsDeleted())
                .collect(Collectors.toList());

        return ApiResponseUtil.success(fields, "Fields fetched successfully", request);
    }

    /**
     * POST /api/forms/{formId}/draft
     * Saves the full list of fields as a draft (replaces existing draft fields).
     */
    @PostMapping("/api/forms/{formId}/draft")
    public ResponseEntity<ApiResponse<String>> saveDraft(
            @PathVariable Long formId,
            @RequestBody List<@Valid AddFieldRequest> fields,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        formBuilderService.saveDraft(formId, fields, currentUser.getUsername());
        return ApiResponseUtil.success("Draft saved", "Draft saved successfully", request);
    }

    /**
     * POST /api/forms/{formId}/publish
     * Publishes the form, making it available for submissions.
     * Caller must have configure access.
     */
    @PostMapping("/api/forms/{formId}/publish")
    public ResponseEntity<ApiResponse<String>> publishForm(
            @PathVariable Long formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (!permissionService.canConfigureForm(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied. You cannot publish this form.",
                    null, HttpStatus.FORBIDDEN, request);
        }

        schemaService.publishForm(formId, currentUser.getUsername());
        return ApiResponseUtil.success("Published successfully", "Form published successfully", request);
    }

    /**
     * POST /api/forms/{formId}/fields/reorder
     * Reorders fields within a form.
     */
    @PostMapping("/api/forms/{formId}/fields/reorder")
    public ResponseEntity<ApiResponse<String>> reorderFields(
            @PathVariable Long formId,
            @Valid @RequestBody ReorderFieldsRequest requestBody,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        formBuilderService.reorderFields(formId, requestBody, currentUser.getUsername());
        return ApiResponseUtil.success("Reordered successfully", "Fields reordered successfully", request);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void assertAuthenticated(UserDetails currentUser) {
        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
    }
}