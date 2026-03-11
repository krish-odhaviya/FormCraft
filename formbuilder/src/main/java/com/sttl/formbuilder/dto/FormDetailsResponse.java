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
    private String tableName;
    private LocalDateTime publishedAt;
    private List<FieldDto> fields;

}
