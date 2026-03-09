package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AddFieldRequest;
import com.sttl.formbuilder.dto.ReorderFieldsRequest;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.service.SchemaService;
import com.sttl.formbuilder.service.VersionService;
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
public class VersionController {

    private final VersionService versionService;
    private final SchemaService schemaService;
    private final FormVersionRepository versionRepository;

    // ── GET /api/forms/{formId}/versions — full version history ───────────────
    @GetMapping("/api/forms/{formId}/versions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listVersions(
            @PathVariable Long formId,
            HttpServletRequest request) {

        List<FormVersion> versions = versionRepository.findByFormIdOrderByVersionNumberAsc(formId);

        List<Map<String, Object>> result = versions.stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("versionNumber", v.getVersionNumber());
            m.put("status", v.getStatus().name());
            m.put("createdAt", v.getCreatedAt());
            m.put("publishedAt", v.getPublishedAt());
            m.put("fieldCount", v.getFields().size());
            m.put("tableName", v.getTableName());
            return m;
        }).collect(Collectors.toList());

        return ApiResponseUtil.success(result, "Versions fetched", request);
    }

    // ── POST /api/forms/{formId}/versions — create blank first draft ──────────
    @PostMapping("/api/forms/{formId}/versions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDraftVersion(
            @PathVariable Long formId,
            HttpServletRequest request) {

        FormVersion version = versionService.createDraftVersion(formId);

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", version.getId());
        dto.put("versionNumber", version.getVersionNumber());
        dto.put("status", version.getStatus().name());
        dto.put("createdAt", version.getCreatedAt());

        return ApiResponseUtil.success(dto, "Draft version created successfully", request);
    }

    // ── POST /api/forms/{formId}/versions/new — branch new draft from published ─
    @PostMapping("/api/forms/{formId}/versions/new")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createNewVersion(
            @PathVariable Long formId,
            HttpServletRequest request) {

        FormVersion newDraft = versionService.createNewVersionFromPublished(formId);

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", newDraft.getId());
        dto.put("versionNumber", newDraft.getVersionNumber());
        dto.put("status", newDraft.getStatus().name());
        dto.put("createdAt", newDraft.getCreatedAt());
        dto.put("fieldCount", newDraft.getFields().size());

        return ApiResponseUtil.success(dto, "New version created from published", request);
    }

    // ── POST /api/versions/{versionId}/fields ─────────────────────────────────
    @PostMapping("/api/versions/{versionId}/fields")
    public ResponseEntity<ApiResponse<FormField>> addField(
            @PathVariable Long versionId,
            @Valid @RequestBody AddFieldRequest requestBody,
            HttpServletRequest request) {

        FormField field = versionService.addField(versionId, requestBody);
        return ApiResponseUtil.success(field, "Field added successfully", request);
    }

    // ── POST /api/versions/{versionId}/draft ──────────────────────────────────
    @PostMapping("/api/versions/{versionId}/draft")
    public ResponseEntity<ApiResponse<String>> saveDraft(
            @PathVariable Long versionId,
            @RequestBody List<AddFieldRequest> fields,
            HttpServletRequest request) {

        versionService.saveDraft(versionId, fields);
        return ApiResponseUtil.success("Draft saved", "Draft saved successfully", request);
    }

    // ── GET /api/versions/{versionId} ─────────────────────────────────────────
    @GetMapping("/api/versions/{versionId}")
    public List<FormField> getFormFields(@PathVariable Long versionId) {
        FormVersion version = versionRepository.findByIdWithFields(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));
        return version.getFields();
    }

    // ── POST /api/versions/{versionId}/publish ────────────────────────────────
    @PostMapping("/api/versions/{versionId}/publish")
    public ResponseEntity<ApiResponse<String>> publishVersion(
            @PathVariable Long versionId,
            HttpServletRequest request) {

        schemaService.publishVersion(versionId);
        return ApiResponseUtil.success("Published successfully", "Version published successfully", request);
    }

    // ── POST /api/versions/{versionId}/fields/reorder ─────────────────────────
    @PostMapping("/api/versions/{versionId}/fields/reorder")
    public ResponseEntity<ApiResponse<String>> reorderFields(
            @PathVariable Long versionId,
            @Valid @RequestBody ReorderFieldsRequest requestBody,
            HttpServletRequest request) {

        versionService.reorderFields(versionId, requestBody);
        return ApiResponseUtil.success("Reordered successfully", "Fields reordered successfully", request);
    }
}