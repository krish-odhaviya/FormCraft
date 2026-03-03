package com.sttl.formbuilder.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class VersionDto {
    private Long id;
    private Integer versionNumber;
    private String status;
    private String tableName;
    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;
    private List<FieldDto> fields;
}