package com.sttl.formbuilder.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import lombok.Data;

import java.util.UUID;

@Data
public class FormDetailsResponse {

    private UUID id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status;
    private String visibility;
    private String tableName;
    private LocalDateTime publishedAt;
    private boolean canEdit;
    private boolean canViewSubmissions;
    private boolean canDeleteSubmissions;
    private String ownerName;
    private UUID ownerId;
    private List<FieldDto> fields;
    private boolean hasLiveSubmissions;
    private UUID formVersionId;
    private Integer activeVersionNumber;
}
