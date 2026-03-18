package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class LookupController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/lookup")
    public ResponseEntity<?> getLookupData(
            @RequestParam String table,
            @RequestParam String valueColumn,
            @RequestParam String labelColumn,
            HttpServletRequest request) {

        //  Security: only allow tables starting with "form_"
        if (!table.startsWith("form_")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid table"));
        }

        try {
            String sql = "SELECT " + valueColumn + ", " + labelColumn
                    + " FROM " + table + " WHERE is_delete = false";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);

            List<Map<String, Object>> result = rows.stream()
                    .map(row -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("value", row.get(valueColumn));
                        m.put("label", String.valueOf(row.get(labelColumn)));
                        return m;
                    })
                    .collect(Collectors.toList());

            return ApiResponseUtil.success(result, "Lookup data", request);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch lookup data: " + e.getMessage()));
        }
    }
}
