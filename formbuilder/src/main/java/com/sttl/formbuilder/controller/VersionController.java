package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.service.FormSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.service.SchemaService;
import com.sttl.formbuilder.service.VersionService;

import java.util.List;

@RestController
@RequestMapping("/api/versions")
public class VersionController {

    private final VersionService versionService;
    private final SchemaService schemaService;
    private final FormSubmissionService formSubmissionService;
    private final FormVersionRepository versionRepository;

    public VersionController(VersionService versionService,
                             SchemaService schemaService, FormSubmissionService formSubmissionService, FormVersionRepository versionRepository) {
        this.versionService = versionService;
        this.schemaService = schemaService;
        this.formSubmissionService = formSubmissionService;
        this.versionRepository = versionRepository;
    }

    // Add Field
    @PostMapping("/{versionId}/fields")
    public ResponseEntity<ApiResponse<FormField>> addField(
            @PathVariable Long versionId,
            @Valid @RequestBody AddFieldRequest requestBody,
            HttpServletRequest request) {

        FormField field = versionService.addField(versionId, requestBody);

        return ApiResponseUtil.success(
                field,
                "Field added successfully",
                request
        );
    }

    @PostMapping("/{versionId}/draft")
    public ResponseEntity<ApiResponse<String>> saveDraft(
            @PathVariable Long versionId,
            @RequestBody List<AddFieldRequest> fields,
            HttpServletRequest request) {

        System.out.println("Working Draft");

        versionService.saveDraft(versionId, fields);

        return ApiResponseUtil.success(
                "Draft saved",
                "Draft saved successfully",
                request
        );
    }

    @GetMapping("/{versionId}")
    public List<FormField> getFormFields(@PathVariable Long versionId) {

        FormVersion version = versionRepository.findByIdWithFields(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        return version.getFields();
    }

    //  Publish Version
    @PostMapping("/{versionId}/publish")
    public ResponseEntity<ApiResponse<String>> publishVersion(
            @PathVariable Long versionId,
            HttpServletRequest request) {

        schemaService.publishVersion(versionId);

        return ApiResponseUtil.success(
                "Published successfully",
                "Version published successfully",
                request
        );
    }



    //  Reorder Fields
    @PostMapping("/{versionId}/fields/reorder")
    public ResponseEntity<ApiResponse<String>> reorderFields(
            @PathVariable Long versionId,
            @Valid @RequestBody ReorderFieldsRequest requestBody,
            HttpServletRequest request) {

        versionService.reorderFields(versionId, requestBody);

        return ApiResponseUtil.success(
                "Reordered successfully",
                "Fields reordered successfully",
                request
        );
    }
}