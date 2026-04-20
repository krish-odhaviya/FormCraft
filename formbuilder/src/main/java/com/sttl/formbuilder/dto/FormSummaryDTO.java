package com.sttl.formbuilder.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class FormSummaryDTO {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private String status;
    private String visibility;
    private String ownerUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean canEdit;
    private boolean canViewSubmissions;
}
