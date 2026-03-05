package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiErrorDetail;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.exception.ValidationException;
import com.sttl.formbuilder.service.FormSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormSubmissionController {

    private final FormSubmissionService formSubmissionService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitForm(
            @RequestBody SubmitFormRequest request,
            HttpServletRequest httprequest
    ) {
        try {
            formSubmissionService.submit(request.getVersionId(), request.getValues());
            return ApiResponseUtil.success("Submitted successfully", "Form submitted successfully", httprequest);

        } catch (ValidationException e) {
            // ✅ Convert Map<fieldKey, msg> → List<ApiErrorDetail>
            List<ApiErrorDetail> errors = e.getErrors().entrySet().stream()
                    .map(entry -> new ApiErrorDetail(entry.getKey(), entry.getValue()))
                    .toList();
            return ApiResponseUtil.error("Form validation failed", errors, HttpStatus.BAD_REQUEST, httprequest);

        } catch (Exception e) {
            System.err.println("SUBMISSION FAILED: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }


    @GetMapping("/{formId}/submissions")
    public ResponseEntity<ApiResponse<SubmissionsResponse>> getSubmissions(@PathVariable Long formId, HttpServletRequest request) {
        SubmissionsResponse response = formSubmissionService.getSubmissions(formId);

        return ApiResponseUtil.success(
                response,
                "Fields reordered successfully",
                request
        );
    }

    @DeleteMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<ApiResponse<String>> deleteSubmission(@PathVariable Long formId,
                                                                @PathVariable Long submissionId,
                                                                HttpServletRequest request) {
        formSubmissionService.softDeleteSubmission(formId, submissionId);
        return ApiResponseUtil.success(
                "Row deleted successfully",
                "Fields reordered successfully",
                request
        );
    }

}
