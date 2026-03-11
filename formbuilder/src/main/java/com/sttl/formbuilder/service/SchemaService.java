package com.sttl.formbuilder.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.util.SqlTypeMapper;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SchemaService {

    private final JdbcTemplate jdbcTemplate;
    private final FormRepository formRepository;
    private final FormFieldRepository fieldRepository;

    @Transactional
    public void publishForm(Long formId) {
        try {
            Form form = formRepository.findById(formId)
                    .orElseThrow(() -> new RuntimeException("Form not found"));

            List<FormField> fields = fieldRepository.findByFormIdAndIsDeletedFalseOrderByFieldOrder(formId);
            if (fields.isEmpty()) {
                throw new RuntimeException("No fields defined — add at least one field before publishing");
            }

            String tableName = form.getTableName();
            boolean isNewTable = false;
            
            if (tableName == null || tableName.isEmpty()) {
                tableName = "form_" + formId + "_data";
                isNewTable = true;
            }

            if (isNewTable) {
                // ── Build & execute the DDL table for this form ──────────────────
                StringBuilder sql = new StringBuilder();
                sql.append("CREATE TABLE ").append(tableName).append(" (")
                        .append("id BIGSERIAL PRIMARY KEY, ")
                        .append("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ")
                        .append("is_delete BOOLEAN DEFAULT false");

                for (FormField field : fields) {
                    if (List.of("SECTION", "LABEL", "PAGE_BREAK", "GROUP").contains(field.getFieldType())) {
                        continue;
                    }
                    sql.append(", ")
                            .append(field.getFieldKey().toLowerCase())
                            .append(" ")
                            .append(SqlTypeMapper.map(field.getFieldType()));

                    if (Boolean.TRUE.equals(field.getRequired())) {
                        sql.append(" NOT NULL");
                    }
                    if (Boolean.TRUE.equals(field.getIsUnique())) {
                        sql.append(" UNIQUE");
                    }
                }
                sql.append(")");

                jdbcTemplate.execute(sql.toString());
                
                form.setTableName(tableName);
            } else {
                // ── Alter existing table to add any missing columns ───────────────
                // Check existing columns in the table
                String columnQuery = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
                List<String> existingColumns = jdbcTemplate.queryForList(columnQuery, String.class, tableName)
                                                .stream().map(String::toLowerCase).collect(Collectors.toList());

                for (FormField field : fields) {
                    if (List.of("SECTION", "LABEL", "PAGE_BREAK", "GROUP").contains(field.getFieldType())) {
                        continue;
                    }
                    String colName = field.getFieldKey().toLowerCase();
                    if (!existingColumns.contains(colName)) {
                        StringBuilder alterSql = new StringBuilder("ALTER TABLE ")
                                .append(tableName)
                                .append(" ADD COLUMN ")
                                .append(colName)
                                .append(" ")
                                .append(SqlTypeMapper.map(field.getFieldType()));
                        
                        if (Boolean.TRUE.equals(field.getRequired())) {
                            alterSql.append(" NOT NULL");
                        }
                        if (Boolean.TRUE.equals(field.getIsUnique())) {
                            alterSql.append(" UNIQUE");
                        }
                                
                        jdbcTemplate.execute(alterSql.toString());
                    } else {
                        // If column exists, ensure NOT NULL constraint is dropped if it's no longer required
                        if (!Boolean.TRUE.equals(field.getRequired())) {
                            String dropNotNullSql = "ALTER TABLE " + tableName + " ALTER COLUMN " + colName + " DROP NOT NULL";
                            jdbcTemplate.execute(dropNotNullSql);
                        }
                    }
                }

                // Also drop NOT NULL for any columns that are no longer in the active fields list (deleted fields)
                Set<String> activeFieldKeys = fields.stream()
                        .map(f -> f.getFieldKey().toLowerCase())
                        .collect(Collectors.toSet());
                
                for (String existingCol : existingColumns) {
                    if (List.of("id", "created_at", "is_delete").contains(existingCol)) continue;
                    if (!activeFieldKeys.contains(existingCol)) {
                        String dropNotNullSql = "ALTER TABLE " + tableName + " ALTER COLUMN " + existingCol + " DROP NOT NULL";
                        jdbcTemplate.execute(dropNotNullSql);
                    }
                }
            }

            // ── Mark this form as PUBLISHED ──────────────────────────────────
            form.setStatus(FormStatusEnum.PUBLISHED);
            form.setPublishedAt(LocalDateTime.now());
            formRepository.save(form);

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Publish failed: " + e.getMessage());
        }
    }
}