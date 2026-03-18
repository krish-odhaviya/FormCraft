package com.sttl.formbuilder.service;

import com.sttl.formbuilder.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LookupService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Fetches value/label pairs from a form table for use in dropdowns.
     * Only tables prefixed with "form_" are allowed to prevent arbitrary SQL access.
     */
    public List<Map<String, Object>> getLookupData(String table, String valueColumn, String labelColumn) {
        if (!table.startsWith("form_")) {
            throw new BusinessException("Invalid table: only form_ tables are allowed", HttpStatus.BAD_REQUEST);
        }

        String sql = "SELECT " + valueColumn + ", " + labelColumn
                + " FROM " + table + " WHERE is_delete = false";

        return jdbcTemplate.queryForList(sql).stream()
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("value", row.get(valueColumn));
                    m.put("label", String.valueOf(row.get(labelColumn)));
                    return m;
                })
                .collect(Collectors.toList());
    }
}