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


    @GetMapping
    public ResponseEntity<ApiResponse<List<Form>>> getAllForms(
            HttpServletRequest request) {

        List<Form> forms = formService.getAllForms();

        return ApiResponseUtil.success(
                forms,
                "Forms fetched successfully",
                request
        );
    }

    @GetMapping("/{formId}")
    public ResponseEntity<ApiResponse<FormDetailsResponse>> getForm(
            @PathVariable Long formId,
            HttpServletRequest request) {

        System.out.println("getForm called");

        FormDetailsResponse response =
                formService.getFormWithStructure(formId);

        return ApiResponseUtil.success(
                response,
                "Form fetched successfully",
                request
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Form>> createForm(
            @Valid @RequestBody CreateFormRequest requestBody,
            HttpServletRequest request) {

        System.out.println("createFrom called");

        Form form = formService.createForm(
                requestBody.getName(),
                requestBody.getDescription()
        );

        return ApiResponseUtil.success(
                form,
                "Form created successfully",
                request
        );
    }

    @PostMapping("/{formId}/versions")
    public ResponseEntity<ApiResponse<FormVersion>> createDraftVersion(
            @PathVariable Long formId,
            HttpServletRequest request) {

        System.out.println("createDraftVersion called");

        FormVersion version =
                versionService.createDraftVersion(formId);

        return ApiResponseUtil.success(
                version,
                "Draft version created successfully",
                request
        );
    }





    @GetMapping("/published-list")
    public ResponseEntity<?> getPublishedForms(HttpServletRequest request) {

        List<FormVersion> publishedVersions = versionRepository.findAllByStatus(FormStatusEnum.PUBLISHED);

        List<Map<String, Object>> result = publishedVersions.stream()
                .map(v -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("formId", v.getForm().getId());
                    m.put("formName", v.getForm().getName());

                    // ✅ Fix: strip "_submissions" suffix — store only base table name
                    String rawTable = v.getTableName(); // e.g. "form_1_v1_submissions"
                                    // e.g. "form_1_v1"
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