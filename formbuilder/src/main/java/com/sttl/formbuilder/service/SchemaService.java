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
public class SchemaService {

    private final JdbcTemplate jdbcTemplate;
    private final FormVersionRepository versionRepository;
    private final FormFieldRepository fieldRepository;


    public SchemaService(JdbcTemplate jdbcTemplate,
                         FormVersionRepository versionRepository,
                         FormFieldRepository fieldRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.versionRepository = versionRepository;
        this.fieldRepository = fieldRepository;
    }

    @Transactional
    public void publishVersion(Long versionId) {
        try {
            System.out.println("Working Inner");

            FormVersion version = versionRepository.findById(versionId)
                    .orElseThrow(() -> new RuntimeException("Version not found"));

            if (version.getStatus() != FormStatusEnum.DRAFT) {
                throw new RuntimeException("Already published");
            }

            List<FormField> fields =
                    fieldRepository.findByVersionIdOrderByFieldOrder(versionId);

            if (fields.isEmpty()) {
                throw new RuntimeException("No fields defined");
            }

            String tableName = "form_" +
                    version.getForm().getId() +
                    "_v" + version.getVersionNumber() +
                    "_submissions";

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
            }
            sql.append(")");

            // ✅ Print the SQL so you can see exactly what's being executed
            System.out.println("=== GENERATED SQL ===");
            System.out.println(sql.toString());
            System.out.println("=====================");

            jdbcTemplate.execute(sql.toString());

            version.setStatus(FormStatusEnum.PUBLISHED);
            version.setTableName(tableName);
            version.setPublishedAt(LocalDateTime.now());

            versionRepository.save(version);

            System.out.println("Published successfully!");

        } catch (Exception e) {
            // ✅ This will print the REAL error
            System.out.println("=== PUBLISH FAILED ===");
            System.out.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.out.println("======================");
            throw e; // re-throw so the 500 still returns to frontend
        }
    }
}