package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.service.LookupService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class LookupController {

    private final LookupService lookupService;

    /**
     * GET /api/forms/lookup?table=form_xxx&valueColumn=id&labelColumn=name
     * Returns value/label pairs from a form table for dropdown fields.
     * Only tables prefixed with "form_" are accessible.
     */
    @GetMapping("/lookup")
    public ResponseEntity<?> getLookupData(
            @RequestParam String table,
            @RequestParam String valueColumn,
            @RequestParam String labelColumn,
            HttpServletRequest request) {

        List<Map<String, Object>> result = lookupService.getLookupData(table, valueColumn, labelColumn);
        return ApiResponseUtil.success(result, "Lookup data", request);
    }
}