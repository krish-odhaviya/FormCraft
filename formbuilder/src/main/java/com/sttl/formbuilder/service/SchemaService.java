package com.sttl.formbuilder.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormVersion;
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
    private final FormVersionService formVersionService;

    /** Reserved system column names that must not be used as field keys. */
    private static final Set<String> RESERVED_COLUMNS = Set.of(
            "id", "created_at", "updated_at", "is_delete", "is_draft", "form_version_id",
            // Common SQL reserved words
            "select", "insert", "update", "delete", "drop", "table", "from", "where",
            "order", "group", "by", "having", "join", "left", "right", "inner", "outer"
    );

    /** Layout-only field types — they produce no data column. */
    private static final Set<String> LAYOUT_TYPES = Set.of("SECTION", "LABEL", "PAGE_BREAK", "GROUP");

    @Transactional
    public void publishForm(Long formId, String publishedBy) {
        try {
            Form form = formRepository.findById(formId)
                    .orElseThrow(() -> new RuntimeException("Form not found"));

            List<FormField> fields = fieldRepository.findByFormIdAndIsDeletedFalseOrderByFieldOrder(formId);
            if (fields.isEmpty()) {
                throw new RuntimeException("No fields defined — add at least one field before publishing");
            }

            // ── Validate field keys against reserved words ──────────────────
            for (FormField f : fields) {
                if (LAYOUT_TYPES.contains(f.getFieldType())) continue;
                String key = f.getFieldKey().toLowerCase();
                if (RESERVED_COLUMNS.contains(key)) {
                    throw new RuntimeException(
                            "Field key '" + f.getFieldKey() + "' is a reserved SQL keyword and cannot be used.");
                }
            }

            String tableName = form.getTableName();
            boolean isNewTable = tableName == null || tableName.isEmpty();

            if (isNewTable) {
                tableName = "form_" + formId + "_data";
                createTable(tableName, fields);
                form.setTableName(tableName);
            } else {
                alterTable(tableName, fields);
            }

            // ── Create a version snapshot ─────────────────────────────────
            FormVersion version = formVersionService.createSnapshot(formId, publishedBy);
            formVersionService.activateVersion(version.getId(), publishedBy);

            // ── Mark form as PUBLISHED ────────────────────────────────────
            form.setStatus(FormStatusEnum.PUBLISHED);
            form.setPublishedAt(LocalDateTime.now());
            formRepository.save(form);

        } catch (Exception e) {
            throw new RuntimeException("Publish failed: " + e.getMessage(), e);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void createTable(String tableName, List<FormField> fields) {
        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE ").append(tableName).append(" (")
                .append("id BIGSERIAL PRIMARY KEY, ")
                .append("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ")
                .append("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ")
                .append("is_draft BOOLEAN NOT NULL DEFAULT false, ")
                .append("form_version_id BIGINT, ")
                .append("is_delete BOOLEAN DEFAULT false");

        for (FormField field : fields) {
            if (LAYOUT_TYPES.contains(field.getFieldType())) continue;
            appendColumnDef(sql, field);
        }
        sql.append(")");

        jdbcTemplate.execute(sql.toString());
    }

    private void alterTable(String tableName, List<FormField> fields) {
        // Fetch existing columns from the DB (case-insensitive)
        String columnQuery = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
        Set<String> existingColumns = jdbcTemplate
                .queryForList(columnQuery, String.class, tableName)
                .stream().map(String::toLowerCase).collect(Collectors.toSet());

        // Add new system columns if they don't exist yet (for tables created before this upgrade)
        addColumnIfMissing(tableName, existingColumns, "updated_at",      "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        addColumnIfMissing(tableName, existingColumns, "is_draft",         "BOOLEAN NOT NULL DEFAULT false");
        addColumnIfMissing(tableName, existingColumns, "form_version_id",  "BIGINT");

        // Add missing field columns, never drop existing ones
        for (FormField field : fields) {
            if (LAYOUT_TYPES.contains(field.getFieldType())) continue;
            String colName = field.getFieldKey().toLowerCase();

            if (!existingColumns.contains(colName)) {
                StringBuilder alterSql = new StringBuilder("ALTER TABLE ")
                        .append(tableName)
                        .append(" ADD COLUMN ")
                        .append(colName)
                        .append(" ")
                        .append(SqlTypeMapper.map(field.getFieldType()));

                // New columns cannot be NOT NULL without a default — omit it
                if (Boolean.TRUE.equals(field.getIsUnique())) {
                    alterSql.append(" UNIQUE");
                }
                jdbcTemplate.execute(alterSql.toString());
            } else {
                // Drop NOT NULL if field is no longer required (never add NOT NULL to existing columns)
                if (!Boolean.TRUE.equals(field.getRequired())) {
                    jdbcTemplate.execute(
                            "ALTER TABLE " + tableName + " ALTER COLUMN " + colName + " DROP NOT NULL");
                }
            }
        }

        // Drop NOT NULL for any columns that were removed from the active field list
        Set<String> activeFieldKeys = fields.stream()
                .filter(f -> !LAYOUT_TYPES.contains(f.getFieldType()))
                .map(f -> f.getFieldKey().toLowerCase())
                .collect(Collectors.toSet());

        for (String existingCol : existingColumns) {
            if (isSystemColumn(existingCol)) continue;
            if (!activeFieldKeys.contains(existingCol)) {
                jdbcTemplate.execute(
                        "ALTER TABLE " + tableName + " ALTER COLUMN " + existingCol + " DROP NOT NULL");
            }
        }
    }

    private void addColumnIfMissing(String tableName, Set<String> existingColumns, String colName, String colDef) {
        if (!existingColumns.contains(colName.toLowerCase())) {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS " + colName + " " + colDef);
        }
    }

    private void appendColumnDef(StringBuilder sql, FormField field) {
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

    private boolean isSystemColumn(String col) {
        return Set.of("id", "created_at", "updated_at", "is_delete", "is_draft", "form_version_id")
                .contains(col);
    }
}