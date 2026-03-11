package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.service.SchemaService;
import com.sttl.formbuilder.service.FormBuilderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class FormBuilderController {

    private final FormBuilderService formBuilderService;
    private final SchemaService schemaService;
    private final FormRepository formRepository;

    // ── POST /api/forms/{formId}/fields ─────────────────────────────────
    @PostMapping("/api/forms/{formId}/fields")
    public ResponseEntity<ApiResponse<FormField>> addField(
            @PathVariable Long formId,
            @Valid @RequestBody AddFieldRequest requestBody,
            HttpServletRequest request) {

        FormField field = formBuilderService.addField(formId, requestBody);
        return ApiResponseUtil.success(field, "Field added successfully", request);
    }

    // ── POST /api/forms/{formId}/draft ──────────────────────────────────
    @PostMapping("/api/forms/{formId}/draft")
    public ResponseEntity<ApiResponse<String>> saveDraft(
            @PathVariable Long formId,
            @RequestBody List<AddFieldRequest> fields,
            HttpServletRequest request) {

        formBuilderService.saveDraft(formId, fields);
        return ApiResponseUtil.success("Draft saved", "Draft saved successfully", request);
    }

    // ── GET /api/forms/{formId}/fields ─────────────────────────────────────────
    @GetMapping("/api/forms/{formId}/fields")
    public List<FormField> getFormFields(@PathVariable Long formId) {
        Form form = formRepository.findByIdWithFields(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        return form.getFields().stream().filter(f -> !f.getIsDeleted()).collect(Collectors.toList());
    }

    // ── POST /api/forms/{formId}/publish ────────────────────────────────
    @PostMapping("/api/forms/{formId}/publish")
    public ResponseEntity<ApiResponse<String>> publishForm(
            @PathVariable Long formId,
            HttpServletRequest request) {

        schemaService.publishForm(formId);
        return ApiResponseUtil.success("Published successfully", "Form published successfully", request);
    }

    // ── POST /api/forms/{formId}/fields/reorder ─────────────────────────
    @PostMapping("/api/forms/{formId}/fields/reorder")
    public ResponseEntity<ApiResponse<String>> reorderFields(
            @PathVariable Long formId,
            @Valid @RequestBody ReorderFieldsRequest requestBody,
            HttpServletRequest request) {

        formBuilderService.reorderFields(formId, requestBody);
        return ApiResponseUtil.success("Reordered successfully", "Fields reordered successfully", request);
    }
}
