package com.sttl.formbuilder.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import java.util.UUID;

@Data
public class VersionDto {
    private UUID id;
    private Integer versionNumber;
    private String status;
    private String tableName;
    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;
    private List<FieldDto> fields;
}