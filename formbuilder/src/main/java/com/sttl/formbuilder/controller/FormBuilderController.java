package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.*;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.FormBuilderService;
import com.sttl.formbuilder.service.SchemaService;
import com.sttl.formbuilder.service.FormVersionService;
import com.sttl.formbuilder.service.PermissionService;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.PublishFormRequest;
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
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@Validated
@RequiredArgsConstructor
public class FormBuilderController {

    private final FormBuilderService formBuilderService;
    private final SchemaService schemaService;
    private final FormRepository formRepository;
    private final FormFieldRepository fieldRepository;
    private final FormVersionService formVersionService;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    /**
     * POST /api/forms/{formId}/fields
     * Adds a new field to a form draft.
     */
    @PostMapping("/forms/{formId}/fields")
    public ResponseEntity<ApiResponse<FormField>> addField(
            @PathVariable UUID formId,
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
            @PathVariable UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

        FormVersion draft = formVersionService.getOrCreateDraftVersion(formId, currentUser.getUsername());
        List<FormField> fields = fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(draft.getId());

        return ApiResponseUtil.success(fields, "Fields fetched successfully", request);
    }

    /**
     * POST /api/forms/{formId}/draft
     * Saves the full list of fields as a draft (replaces existing draft fields).
     */
    @PostMapping("/forms/{formId}/draft")
    public ResponseEntity<ApiResponse<List<FieldDto>>> saveDraft(
            @PathVariable UUID formId,
            @RequestBody @Valid List<AddFieldRequest> fields,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        List<FieldDto> savedFields = formBuilderService.saveDraft(formId, fields, currentUser.getUsername());
        return ApiResponseUtil.success(savedFields, "Draft saved successfully", request);
    }

    /**
     * POST /api/forms/{formId}/publish
     * Publishes the form, making it available for submissions.
     * Caller must have configure access.
     */
    @PostMapping("/forms/{formId}/publish")
    public ResponseEntity<ApiResponse<String>> publishForm(
            @PathVariable UUID formId,
            @RequestBody(required = false) PublishFormRequest publishRequest,
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

        // If user is in the builder and sends current fields in the request, save them first as a draft.
        // This ensures the publish action uses the latest data and avoids "empty draft" errors.
        if (publishRequest != null && publishRequest.getFields() != null && !publishRequest.getFields().isEmpty()) {
            formBuilderService.saveDraft(formId, publishRequest.getFields(), currentUser.getUsername());
        }

        schemaService.publishForm(formId, currentUser.getUsername());
        return ApiResponseUtil.success("Published successfully", "Form published successfully", request);
    }

    /**
     * POST /api/forms/{formId}/fields/reorder
     * Reorders fields within a form.
     */
    @PostMapping("/forms/{formId}/fields/reorder")
    public ResponseEntity<ApiResponse<String>> reorderFields(
            @PathVariable UUID formId,
            @Valid @RequestBody ReorderFieldsRequest requestBody,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        formBuilderService.reorderFields(formId, requestBody, currentUser.getUsername());
        return ApiResponseUtil.success("Reordered successfully", "Fields reordered successfully", request);
    }

    @GetMapping("/forms/{formId}/validations")
    public ResponseEntity<ApiResponse<List<ValidationRuleDTO>>> getValidations(
            @PathVariable UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        List<ValidationRuleDTO> validations = formBuilderService.getValidations(formId, currentUser.getUsername());
        return ApiResponseUtil.success(validations, "Validations fetched successfully", request);
    }

    @PostMapping("/forms/{formId}/validations")
    public ResponseEntity<ApiResponse<String>> saveValidations(
            @PathVariable UUID formId,
            @RequestBody List<ValidationRuleDTO> validations,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        formBuilderService.saveValidations(formId, validations, currentUser.getUsername());
        return ApiResponseUtil.success("Saved successfully", "Validations saved successfully", request);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void assertAuthenticated(UserDetails currentUser) {
        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
    }
}