package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.service.FormService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;
    private final FormVersionRepository versionRepository;

    // ── GET /api/forms — only returns forms owned by the logged-in user ───────
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllForms(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        List<Form> forms = formService.getAllForms(currentUser.getUsername());
        
        List<Map<String, Object>> response = forms.stream().map(form -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", form.getId());
            map.put("name", form.getName());
            map.put("description", form.getDescription());
            map.put("createdAt", form.getCreatedAt());
            map.put("updatedAt", form.getUpdatedAt());
            
            // Fetch versions to calculate status badges on frontend
            List<FormVersion> versions = versionRepository.findByFormIdOrderByVersionNumberAsc(form.getId());
            List<Map<String, Object>> versionMaps = versions.stream().map(v -> {
                Map<String, Object> vMap = new LinkedHashMap<>();
                vMap.put("id", v.getId());
                vMap.put("versionNumber", v.getVersionNumber());
                vMap.put("status", v.getStatus().name());
                return vMap;
            }).collect(Collectors.toList());
            
            map.put("versions", versionMaps);
            return map;
        }).collect(Collectors.toList());

        return ApiResponseUtil.success(response, "Forms fetched successfully", request);
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