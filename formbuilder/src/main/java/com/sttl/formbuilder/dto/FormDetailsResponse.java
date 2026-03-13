package com.sttl.formbuilder.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import lombok.Data;

@Data
public class FormDetailsResponse {

    private Long id;
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
    private String ownerName;
    private Long ownerId;
    private List<FieldDto> fields;

}
