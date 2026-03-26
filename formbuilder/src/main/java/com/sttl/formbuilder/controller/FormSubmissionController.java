package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
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

import java.util.List;
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
            @Valid @RequestBody com.sttl.formbuilder.dto.DraftRequest draftRequest,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Log in to save a draft", null, HttpStatus.UNAUTHORIZED, request);
        }

        UUID submissionId = formSubmissionService.saveDraft(draftRequest, currentUser.getUsername());
        
        java.util.Map<String, Object> data = new java.util.HashMap<>();
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

        com.sttl.formbuilder.dto.DraftResponse draft = formSubmissionService.getDraft(formId, currentUser.getUsername());
        return ApiResponseUtil.success(draft, "Draft fetched successfully", request);
    }

    /**
     * GET /api/v1/forms/{formId}/submissions
     * Returns paginated submissions. Supports ?page, ?size, ?sort, ?search.
     */
    @GetMapping("/forms/{formId}/submissions")
    public ResponseEntity<ApiResponse<PagedSubmissionsResponse>> getSubmissions(
            @PathVariable UUID formId,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) UUID versionId,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = resolveForm(formId);
        User user = resolveOptionalUser(currentUser);

        if (!permissionService.canViewSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to view submissions",
                    null, HttpStatus.FORBIDDEN, request);
        }

        PagedSubmissionsResponse response = formSubmissionService.getSubmissionsPaged(formId, search, versionId, pageable);
        return ApiResponseUtil.success(response, "Submissions fetched successfully", request);
    }

    /**
     * GET /api/v1/forms/{formId}/submissions/export?search=&format=csv|pdf|word|xlsx
     * Downloads all matching submissions as a file.
     */
    @GetMapping("/forms/{formId}/submissions/export")
    public ResponseEntity<byte[]> exportSubmissions(
            @PathVariable UUID formId,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) UUID versionId,
            @RequestParam(defaultValue = "csv") String format,
            @AuthenticationPrincipal UserDetails currentUser) {

        Form form = resolveForm(formId);
        User user = resolveOptionalUser(currentUser);

        if (!permissionService.canViewSubmissions(user, form)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        SubmissionsResponse data = formSubmissionService.exportSubmissions(formId, search, versionId);
        return exportService.export(data, format);
    }

    /**
     * DELETE /api/v1/forms/{formId}/submissions/{submissionId}
     * Soft-deletes a single submission.
     */
    @DeleteMapping("/forms/{formId}/submissions/{submissionId}")
    public ResponseEntity<ApiResponse<String>> deleteSubmission(
            @PathVariable UUID formId,
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = resolveForm(formId);
        User user = resolveOptionalUser(currentUser);

        if (!permissionService.canDeleteSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to delete submissions",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.softDeleteSubmission(formId, submissionId);
        return ApiResponseUtil.success("Row deleted successfully", "Submission deleted successfully", request);
    }

    /**
     * POST /api/v1/forms/{formId}/submissions/bulk-delete
     * Soft-deletes multiple submissions at once.
     */
    @PostMapping("/forms/{formId}/submissions/bulk-delete")
    public ResponseEntity<ApiResponse<String>> bulkDeleteSubmissions(
            @PathVariable UUID formId,
            @RequestBody List<UUID> submissionIds,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = resolveForm(formId);
        User user = resolveOptionalUser(currentUser);

        if (!permissionService.canDeleteSubmissions(user, form)) {
            return ApiResponseUtil.error(
                    "Access denied to bulk delete submissions",
                    null, HttpStatus.FORBIDDEN, request);
        }

        formSubmissionService.softDeleteSubmissionsBulk(formId, submissionIds);
        return ApiResponseUtil.success("Rows deleted successfully", "Submissions deleted successfully", request);
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
}