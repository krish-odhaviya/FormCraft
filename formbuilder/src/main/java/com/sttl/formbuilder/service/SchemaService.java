package com.sttl.formbuilder.service;

import java.time.LocalDateTime;
import java.util.List;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.repository.FormFieldRepository;
import com.sttl.formbuilder.repository.FormVersionRepository;
import com.sttl.formbuilder.util.SqlTypeMapper;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SchemaService {

    private final JdbcTemplate jdbcTemplate;
    private final FormVersionRepository versionRepository;
    private final FormFieldRepository fieldRepository;

    @Transactional
    public void publishVersion(Long versionId) {
        try {
            FormVersion version = versionRepository.findById(versionId)
                    .orElseThrow(() -> new RuntimeException("Version not found"));

            if (version.getStatus() != FormStatusEnum.DRAFT) {
                throw new RuntimeException("Only a DRAFT version can be published");
            }

            List<FormField> fields = fieldRepository.findByVersionIdOrderByFieldOrder(versionId);
            if (fields.isEmpty()) {
                throw new RuntimeException("No fields defined — add at least one field before publishing");
            }

            Long formId = version.getForm().getId();

            // ── Archive the currently PUBLISHED version (if any) ────────────────
            versionRepository.findByFormIdAndStatus(formId, FormStatusEnum.PUBLISHED)
                    .ifPresent(existingPublished -> {
                        existingPublished.setStatus(FormStatusEnum.ARCHIVED);
                        versionRepository.save(existingPublished);
                    });

            // ── Build & execute the DDL table for this version ──────────────────
            String tableName = "form_" + formId + "_v" + version.getVersionNumber() + "_submissions";

            StringBuilder sql = new StringBuilder();
            sql.append("CREATE TABLE ").append(tableName).append(" (")
                    .append("id BIGSERIAL PRIMARY KEY, ")
                    .append("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ")
                    .append("is_delete BOOLEAN DEFAULT false");

            for (FormField field : fields) {
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

            System.out.println("=== GENERATED SQL ===");
            System.out.println(sql);
            System.out.println("=====================");

            jdbcTemplate.execute(sql.toString());

            // ── Mark this version as PUBLISHED ──────────────────────────────────
            version.setStatus(FormStatusEnum.PUBLISHED);
            version.setTableName(tableName);
            version.setPublishedAt(LocalDateTime.now());
            versionRepository.save(version);

            System.out.println("Published successfully — v" + version.getVersionNumber());

        } catch (Exception e) {
            System.out.println("=== PUBLISH FAILED ===");
            System.out.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.out.println("======================");
            throw e;
        }
    }
}