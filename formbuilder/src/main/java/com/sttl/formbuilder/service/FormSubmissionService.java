package com.sttl.formbuilder.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.dto.FieldDto;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.repository.FormVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormSubmissionService {

    private final FormVersionRepository versionRepository;
    private final JdbcTemplate jdbcTemplate;
    private ObjectMapper objectMapper;
    // Spring Boot automatically provides this

    public void submit(Long versionId, Map<String, Object> values) {

        FormVersion version = versionRepository.findByIdWithFields(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (values == null || values.isEmpty()) {
            throw new RuntimeException("Submission cannot be empty");
        }

        String tableName = version.getTableName();

        // 1. Get allowed fields AND required fields from the DB
        Set<String> allowedKeys = version.getFields().stream()
                .map(f -> f.getFieldKey())
                .collect(Collectors.toSet());

        Set<String> requiredKeys = version.getFields().stream()
                .filter(f -> f.getRequired())
                .map(f -> f.getFieldKey())
                .collect(Collectors.toSet());

        // 2. Validate Required Fields are present
        for (String reqKey : requiredKeys) {
            Object val = values.get(reqKey);
            if (val == null || val.toString().trim().isEmpty()) {
                throw new RuntimeException("Missing required field: " + reqKey);
            }
        }

        // 3. Prepare ordered lists for SQL safely
        List<String> columnsList = new ArrayList<>();
        List<Object> argumentsList = new ArrayList<>();

        // Iterate entrySet() to guarantee the column name matches the exact value injected!
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            String key = entry.getKey();
            Object val = entry.getValue();

            // Validate against tampering
            if (!allowedKeys.contains(key)) {
                throw new RuntimeException("Invalid field submitted: " + key);
            }

            columnsList.add(key);

            // Handle Arrays (like Checkbox Groups) -> Convert to JSON String
            if (val instanceof List) {
                try {
                    val = objectMapper.writeValueAsString(val);
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Failed to parse list value for field: " + key);
                }
            }

            argumentsList.add(val);
        }

        // 4. Build the SQL Query
        String columns = String.join(", ", columnsList);

        String placeholders = columnsList.stream()
                .map(k -> "?")
                .collect(Collectors.joining(", "));

        String sql = "INSERT INTO " + tableName + " (" + columns + ") VALUES (" + placeholders + ")";

        // 5. Execute using the perfectly ordered arguments list
        jdbcTemplate.update(sql, argumentsList.toArray());
    }


    @Transactional(readOnly = true)
    public SubmissionsResponse getSubmissions(Long formId) {

        // FIX 1: Pass the Enum directly, not as a String
        FormVersion publishedVersion = versionRepository.findByFormIdAndStatus(formId, FormStatusEnum.PUBLISHED)
                .orElseThrow(() -> new RuntimeException("No published version found for this form"));

        String tableName = publishedVersion.getTableName();

        System.out.println("Querying Table: " + tableName);

        // 2. Map the columns (fields) so the frontend knows what to display
        List<FieldDto> columns = publishedVersion.getFields().stream()
                .map(f -> {
                    FieldDto dto = new FieldDto();
                    dto.setFieldKey(f.getFieldKey());
                    dto.setFieldLabel(f.getFieldLabel());
                    dto.setFieldType(f.getFieldType());
                    return dto;
                })
                .collect(Collectors.toList());

        // 3. Fetch all rows from the dynamic table
        String sql = "SELECT * FROM " + tableName + " WHERE is_delete = false ORDER BY id DESC";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);

        // 4. Package and return
        SubmissionsResponse response = new SubmissionsResponse();
        response.setColumns(columns);
        response.setRows(rows);

        return response;
    }

    @Transactional
    public void softDeleteSubmission(Long formId, Long submissionId) {

        FormVersion publishedVersion = versionRepository.findByFormIdAndStatus(formId, FormStatusEnum.PUBLISHED)
                .orElseThrow(() -> new RuntimeException("No published version found for this form"));

        String tableName = publishedVersion.getTableName();

        String sql = "UPDATE " + tableName + " SET is_delete = true WHERE id = ?";

        jdbcTemplate.update(sql, submissionId);
    }
}
