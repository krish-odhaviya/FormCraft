package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.common.ApiErrorDetail;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.exception.ValidationException;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.service.FormSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.service.FormService;
import com.sttl.formbuilder.service.VersionService;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;

import jakarta.validation.Valid;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;
    private final VersionService versionService;
    private final FormSubmissionService formSubmissionService;
    private final FormVersionRepository versionRepository;
    private final JdbcTemplate jdbcTemplate;

    // ── GET /api/forms — only returns forms owned by the logged-in user ───────
    @GetMapping
    public ResponseEntity<ApiResponse<List<Form>>> getAllForms(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        List<Form> forms = formService.getAllForms(currentUser.getUsername());
        return ApiResponseUtil.success(forms, "Forms fetched successfully", request);
    }

    // ── GET /api/forms/{formId} — ownership enforced ──────────────────────────
    @GetMapping("/{formId}")
    public ResponseEntity<ApiResponse<FormDetailsResponse>> getForm(
            @PathVariable Long formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        // currentUser is null for the public /view endpoint (handled by SecurityConfig)
        String username = currentUser != null ? currentUser.getUsername() : null;
        FormDetailsResponse response = formService.getFormWithStructure(formId, username);
        return ApiResponseUtil.success(response, "Form fetched successfully", request);
    }

    // ── POST /api/forms — create form for logged-in user ─────────────────────
    @PostMapping
    public ResponseEntity<ApiResponse<Form>> createForm(
            @Valid @RequestBody CreateFormRequest requestBody,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        Form form = formService.createForm(
                requestBody.getName(),
                requestBody.getDescription(),
                currentUser.getUsername()
        );
        return ApiResponseUtil.success(form, "Form created successfully", request);
    }

    // ── POST /api/forms/{formId}/versions ─────────────────────────────────────
    @PostMapping("/{formId}/versions")
    public ResponseEntity<ApiResponse<FormVersion>> createDraftVersion(
            @PathVariable Long formId,
            HttpServletRequest request) {

        FormVersion version = versionService.createDraftVersion(formId);
        return ApiResponseUtil.success(version, "Draft version created successfully", request);
    }

    // ── GET /api/forms/published-list (public) ────────────────────────────────
    @GetMapping("/published-list")
    public ResponseEntity<?> getPublishedForms(HttpServletRequest request) {
        List<FormVersion> publishedVersions = versionRepository.findAllByStatus(FormStatusEnum.PUBLISHED);

        List<Map<String, Object>> result = publishedVersions.stream()
                .map(v -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("formId", v.getForm().getId());
                    m.put("formName", v.getForm().getName());
                    m.put("tableName", v.getTableName());
                    List<Map<String, String>> fieldOptions = v.getFields().stream()
                            .map(f -> Map.of("key", f.getFieldKey(), "label", f.getFieldLabel()))
                            .collect(Collectors.toList());
                    m.put("fields", fieldOptions);
                    return m;
                })
                .collect(Collectors.toList());

        return ApiResponseUtil.success(result, "Published forms", request);
    }
}