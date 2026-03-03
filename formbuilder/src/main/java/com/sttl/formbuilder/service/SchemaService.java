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
                // Use BIGSERIAL for Postgres auto-increment
                .append("id BIGSERIAL PRIMARY KEY, ")
                .append("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ")
                .append("is_delete BOOLEAN DEFAULT false");

        for (FormField field : fields) {
            sql.append(", ") // Put comma at start to avoid deleteCharAt logic
                    .append(field.getFieldKey().toLowerCase()) // Force lowercase for Postgres safety
                    .append(" ")
                    .append(SqlTypeMapper.map(field.getFieldType()));

            if (Boolean.TRUE.equals(field.getRequired())) {
                sql.append(" NOT NULL");
            }
        }
        sql.append(")");

        jdbcTemplate.execute(sql.toString());

        version.setStatus(FormStatusEnum.PUBLISHED);
        version.setTableName(tableName);
        version.setPublishedAt(LocalDateTime.now());

        versionRepository.save(version);
    }
}