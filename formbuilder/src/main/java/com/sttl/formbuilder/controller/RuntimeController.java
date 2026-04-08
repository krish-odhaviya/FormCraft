package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.constant.ApiEndpoints;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.DraftRequest;
import com.sttl.formbuilder.dto.DraftResponse;
import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.FormService;
import com.sttl.formbuilder.service.FormSubmissionService;
import com.sttl.formbuilder.service.PermissionService;
import com.sttl.formbuilder.Enums.FormStatusEnum;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * SRS §4.1 — Runtime Form Endpoints
 * <p>
 * Provides the /api/v1/runtime/forms/{formCode} API surface
 * for form rendering and submission at runtime.
 * <ul>
 *   <li>GET  /runtime/forms/{formCode}                             — resolve active form for rendering</li>
 *   <li>POST /runtime/forms/{formCode}/submissions/draft           — save draft submission</li>
 *   <li>POST /runtime/forms/{formCode}/submissions/submit          — final submission</li>
 * </ul>
 * All operations are keyed by the stable, immutable form {@code code} (slug), not UUID.
 */
@Slf4j
@RestController
@RequestMapping(ApiEndpoints.RUNTIME_BASE)
@RequiredArgsConstructor
public class RuntimeController {

    private final FormRepository         formRepository;
    private final FormVersionRepository  formVersionRepository;
    private final FormSubmissionService  formSubmissionService;
    private final FormService            formService;
    private final PermissionService      permissionService;
    private final UserRepository         userRepository;

    // ─── GET /api/runtime/forms/{formCode} ────────────────────────────────────

    /**
     * SRS §4.1 — Runtime Form Resolution.
     * Returns render-ready form definition keyed by the immutable form code.
     * Only the active version is returned. Archived/draft forms are rejected.
     */
    @GetMapping("/{formCode}")
    public ResponseEntity<ApiResponse<FormDetailsResponse>> getRuntimeForm(
            @PathVariable String formCode,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        log.info("RuntimeController.getRuntimeForm: code={}", formCode);

        Form form = resolveFormByCode(formCode);

        if (form.getStatus() == FormStatusEnum.ARCHIVED) {
            return ApiResponseUtil.error(
                    "Form '" + formCode + "' is archived and cannot be filled.",
                    null, HttpStatus.GONE, request);
        }
        if (form.getStatus() == FormStatusEnum.DRAFT) {
            return ApiResponseUtil.error(
                    "Form '" + formCode + "' is not yet published.",
                    null, HttpStatus.NOT_FOUND, request);
        }

        User user = currentUser != null
                ? userRepository.findByUsername(currentUser.getUsername()).orElse(null)
                : null;

        if (!permissionService.canViewForm(user, form)) {
            return ApiResponseUtil.error(
                    "You do not have permission to access this form.",
                    null, HttpStatus.FORBIDDEN, request);
        }

        // Verify an active version exists before returning
        formVersionRepository.findByFormIdAndIsActive(form.getId(), true)
                .orElseThrow(() -> new BusinessException(
                        "Form '" + formCode + "' has no active version.", HttpStatus.NOT_FOUND));

        String username = currentUser != null ? currentUser.getUsername() : null;
        FormDetailsResponse response = formService.getFormWithStructure(form.getId(), username, "fill");
        return ApiResponseUtil.success(response, "Form resolved successfully", request);
    }

    // ─── POST /api/runtime/forms/{formCode}/submissions/draft ─────────────────

    /**
     * SRS §4.4 — Draft Save Flow.
     * Persists a partial form submission as a DRAFT. Minimal validation applied.
     * Requires authentication — anonymous users cannot save drafts.
     */
    @PostMapping("/{formCode}" + ApiEndpoints.SUBMISSIONS + ApiEndpoints.DRAFT)
    public ResponseEntity<?> saveDraft(
            @PathVariable String formCode,
            @RequestBody DraftRequest draftRequest,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Authentication required to save a draft.",
                    null, HttpStatus.UNAUTHORIZED, request);
        }

        Form form = resolveFormByCode(formCode);

        // Enforce active form status for draft saves
        if (form.getStatus() != FormStatusEnum.PUBLISHED) {
            return ApiResponseUtil.error(
                    "Drafts can only be saved for published forms.",
                    null, HttpStatus.BAD_REQUEST, request);
        }

        // Resolve the active version to associate the draft with
        FormVersion activeVersion = formVersionRepository.findByFormIdAndIsActive(form.getId(), true)
                .orElseThrow(() -> new BusinessException(
                        "No active version found for form '" + formCode + "'.", HttpStatus.CONFLICT));

        // Override the formId and formVersionId with server-resolved values (backend is authoritative)
        draftRequest.setFormId(form.getId());
        draftRequest.setFormVersionId(activeVersion.getId());

        UUID submissionId = formSubmissionService.saveDraft(draftRequest, currentUser.getUsername());

        Map<String, Object> data = new HashMap<>();
        data.put("submissionId", submissionId);
        data.put("status", "DRAFT");

        return ApiResponseUtil.success(data, "Draft saved successfully", request);
    }

    /**
     * SRS §4.1 / §4.5 — Retrieve saved draft submission by form code.
     * Allows authenticated users to resume their progress on a specific form.
     */
    @GetMapping("/{formCode}/submissions/draft")
    public ResponseEntity<?> getDraft(
            @PathVariable String formCode,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Authentication required to retrieve a draft.",
                    null, HttpStatus.UNAUTHORIZED, request);
        }

        Form form = resolveFormByCode(formCode);

        // Fetch draft — note that we use the internal UUID to call the service
        // but the code-based path abstractions protect the user from seeing the UUID.
        DraftResponse draft = formSubmissionService.getDraft(form.getId(), currentUser.getUsername());

        if (draft == null) {
            return ApiResponseUtil.success(null, "No draft found for this user.", request);
        }

        return ApiResponseUtil.success(draft, "Draft retrieved successfully", request);
    }

    // ─── POST /api/runtime/forms/{formCode}/submissions/submit ────────────────

    /**
     * SRS §4.5 — Final Submission Validation & Persistence.
     * Authoritatively validates the submission, then persists it as SUBMITTED.
     * Blocks submission if validation errors exist (consolidated error feedback).
     */
    @PostMapping("/{formCode}" + ApiEndpoints.SUBMISSIONS + ApiEndpoints.SUBMIT)
    public ResponseEntity<?> submitForm(
            @PathVariable String formCode,
            @RequestBody SubmitFormRequest submitRequest,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        log.info("RuntimeController.submitForm: code={}, user={}", formCode,
                currentUser != null ? currentUser.getUsername() : "ANONYMOUS");

        Form form = resolveFormByCode(formCode);

        if (form.getStatus() != FormStatusEnum.PUBLISHED) {
            return ApiResponseUtil.error(
                    "Form '" + formCode + "' is not accepting submissions.",
                    null, HttpStatus.BAD_REQUEST, request);
        }

        User user = currentUser != null
                ? userRepository.findByUsername(currentUser.getUsername()).orElse(null)
                : null;

        if (!permissionService.canSubmitForm(user, form)) {
            return ApiResponseUtil.error(
                    "You do not have permission to submit this form.",
                    null, HttpStatus.FORBIDDEN, request);
        }

        // Override with server-resolved formId — client cannot choose which form to submit to
        submitRequest.setFormId(form.getId());

        formSubmissionService.submit(submitRequest, user != null ? user.getUsername() : null);
        return ApiResponseUtil.success("Submitted successfully", "Form submitted successfully", request);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Form resolveFormByCode(String formCode) {
        return formRepository.findByCode(formCode)
                .orElseThrow(() -> new BusinessException(
                        "Form not found for code: '" + formCode + "'", HttpStatus.NOT_FOUND));
    }
}
