package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.DraftRequest;
import com.sttl.formbuilder.dto.DraftResponse;
import com.sttl.formbuilder.dto.PagedSubmissionsResponse;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.ExportService;
import com.sttl.formbuilder.service.FormSubmissionService;
import com.sttl.formbuilder.service.PermissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
public class FormSubmissionController {

    private final FormSubmissionService formSubmissionService;
    private final PermissionService permissionService;
    private final UserRepository userRepository;
    private final FormRepository formRepository;
    private final ExportService exportService;

    /**
     * POST /api/v1/forms/submit
     * Submits a form response. Anonymous access allowed for PUBLIC forms.
     */
    @PostMapping("/forms/submit")
    public ResponseEntity<?> submitForm(
            @Valid @RequestBody SubmitFormRequest submitRequest,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(submitRequest.getFormId());

        if (!permissionService.canSubmitForm(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to submit this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.submit(submitRequest, user != null ? user.getUsername() : null);
        return ApiResponseUtil.success("Submitted successfully", "Form submitted successfully", request);
    }

    /**
     * POST /api/v1/submissions/draft
     * Saves or updates a draft for the current user.
     */
    @PostMapping("/submissions/draft")
    public ResponseEntity<?> saveDraft(
            @Valid @RequestBody DraftRequest draftRequest,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Log in to save a draft", null, HttpStatus.UNAUTHORIZED, request);
        }

        UUID submissionId = formSubmissionService.saveDraft(draftRequest, currentUser.getUsername());
        
        Map<String, Object> data = new HashMap<>();
        data.put("submissionId", submissionId);
        data.put("status", "DRAFT");
        
        return ApiResponseUtil.success(data, "Draft saved successfully", request);
    }

    /**
     * GET /api/v1/submissions/draft?formId=<uuid>
     * Retrieves the existing draft for the user and form.
     */
    @GetMapping("/submissions/draft")
    public ResponseEntity<?> getDraft(
            @RequestParam UUID formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.success(null, "No draft (not logged in)", request);
        }

        DraftResponse draft = formSubmissionService.getDraft(formId, currentUser.getUsername());
        return ApiResponseUtil.success(draft, "Draft fetched successfully", request);
    }

    /**
     * GET /api/v1/forms/{formId}/submissions
     * Returns paginated submissions for a specific form.
     */
    @GetMapping("/forms/{formId}/submissions")
    public ResponseEntity<?> getSubmissions(
            @PathVariable UUID formId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID versionId,
            @RequestParam(defaultValue = "false") boolean showDeleted,
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canViewSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to view submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        PagedSubmissionsResponse response = formSubmissionService.getSubmissionsPaged(formId, search, versionId, showDeleted, pageable);
        return ApiResponseUtil.success(response, "Submissions fetched successfully", request);
    }

    /**
     * GET /api/v1/forms/{formId}/submissions/export
     * Exports all submissions for a specific form as XLSX.
     */
    @GetMapping("/forms/{formId}/submissions/export")
    public ResponseEntity<?> exportSubmissions(
            @PathVariable UUID formId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID versionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canViewSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to export submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        SubmissionsResponse response = formSubmissionService.exportSubmissions(formId, search, versionId);
        return exportService.export(response, "xlsx");
    }

    /**
     * DELETE /api/v1/forms/{formId}/submissions/{submissionId}
     * Soft-deletes a single submission.
     */
    @DeleteMapping("/forms/{formId}/submissions/{submissionId}")
    public ResponseEntity<?> deleteSubmission(
            @PathVariable UUID formId,
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canDeleteSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to delete submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.softDeleteSubmission(formId, submissionId);
        return ApiResponseUtil.success("Deleted successfully", "Submission deleted successfully", request);
    }

    /**
     * POST /api/v1/forms/{formId}/submissions/bulk-delete
     * Soft-deletes multiple submissions.
     */
    @PostMapping("/forms/{formId}/submissions/bulk-delete")
    public ResponseEntity<?> bulkDeleteSubmissions(
            @PathVariable UUID formId,
            @RequestBody List<UUID> submissionIds,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canDeleteSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to delete submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.softDeleteSubmissionsBulk(formId, submissionIds);
        return ApiResponseUtil.success("Rows deleted successfully", "Submissions deleted successfully", request);
    }

    /**
     * POST /api/v1/forms/{formId}/submissions/{submissionId}/restore
     * Restores a single soft-deleted submission.
     */
    @PostMapping("/forms/{formId}/submissions/{submissionId}/restore")
    public ResponseEntity<?> restoreSubmission(
            @PathVariable UUID formId,
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        // Standard requirement: restoring is usually restricted to those who can delete/manage
        if (!permissionService.canDeleteSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to restore submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.restoreSubmission(formId, submissionId);
        return ApiResponseUtil.success("Restored successfully", "Submission restored successfully", request);
    }

    /**
     * POST /api/v1/forms/{formId}/submissions/bulk-restore
     * Restores multiple soft-deleted submissions.
     */
    @PostMapping("/forms/{formId}/submissions/bulk-restore")
    public ResponseEntity<?> bulkRestoreSubmissions(
            @PathVariable UUID formId,
            @RequestBody List<UUID> submissionIds,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canDeleteSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to restore submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.restoreSubmissionsBulk(formId, submissionIds);
        return ApiResponseUtil.success("Restored successfully", "Submissions restored successfully", request);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Form resolveForm(UUID formId) {
        return formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
    }

    private User resolveOptionalUser(UserDetails currentUser) {
        if (currentUser == null) return null;
        return userRepository.findByUsername(currentUser.getUsername()).orElse(null);
    }

    /**
     * GET /api/v1/forms/{formId}/submissions/{submissionId}
     * Returns full submission detail for the read-only detail view.
     */
    @GetMapping("/forms/{formId}/submissions/{submissionId}")
    public ResponseEntity<?> getSubmissionDetail(
            @PathVariable UUID formId,
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        User user = resolveOptionalUser(currentUser);
        Form form = resolveForm(formId);

        if (!permissionService.canViewSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to view submissions for this form",
                    null, HttpStatus.FORBIDDEN, request);
        }

        try {
            Map<String, Object> detail = formSubmissionService.getSubmissionDetail(formId, submissionId);
            return ApiResponseUtil.success(detail, "Submission detail fetched", request);
        } catch (BusinessException e) {
            return ApiResponseUtil.error(e.getMessage(), null, e.getStatus(), request);
        }
    }
}