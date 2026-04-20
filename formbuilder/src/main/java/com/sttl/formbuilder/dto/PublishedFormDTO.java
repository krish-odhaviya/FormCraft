package com.sttl.formbuilder.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class PublishedFormDTO {
    private UUID formId;
    private String formName;
    private String tableName;
    private List<PublishedFormFieldDTO> fields;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PublishedFormFieldDTO {
        private String key;
        private String label;
    }
}
