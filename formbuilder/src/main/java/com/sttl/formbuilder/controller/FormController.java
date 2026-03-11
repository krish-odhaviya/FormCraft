package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.repository.FormRepository;
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
    private final FormRepository formRepository;

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
            map.put("status", form.getStatus().name());
            
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


    // ── GET /api/forms/published-list ─────────────────────────────────────────
    @GetMapping("/published-list")
    public ResponseEntity<?> getPublishedForms(
            @RequestParam(required = false) Long excludeFormId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Unauthorized", null, org.springframework.http.HttpStatus.UNAUTHORIZED, request);
        }

        List<Form> publishedForms = formRepository.findAllByStatus(FormStatusEnum.PUBLISHED);

        List<Map<String, Object>> result = publishedForms.stream()
                .filter(f -> f.getCreatedByUsername().equals(currentUser.getUsername()))
                .filter(f -> excludeFormId == null || !f.getId().equals(excludeFormId))
                .map(f -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("formId", f.getId());
                    m.put("formName", f.getName());
                    m.put("tableName", f.getTableName());
                    List<Map<String, String>> fieldOptions = f.getFields().stream()
                            .filter(field -> !field.getIsDeleted())
                            .map(field -> Map.of("key", field.getFieldKey(), "label", field.getFieldLabel()))
                            .collect(Collectors.toList());
                    m.put("fields", fieldOptions);
                    return m;
                })
                .collect(Collectors.toList());

        return ApiResponseUtil.success(result, "Published forms", request);
    }

    @PostMapping("/{formId}/archive")
    public ResponseEntity<?> archiveForm(
            @PathVariable Long formId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        if (currentUser == null) {
            return ApiResponseUtil.error("Unauthorized", null, org.springframework.http.HttpStatus.UNAUTHORIZED, request);
        }

        try {
            Form form = formService.archiveForm(formId, currentUser.getUsername());
            return ApiResponseUtil.success(form, "Form archived successfully", request);
        } catch (Exception e) {
            return ApiResponseUtil.error(e.getMessage(), null, org.springframework.http.HttpStatus.BAD_REQUEST, request);
        }
    }
}