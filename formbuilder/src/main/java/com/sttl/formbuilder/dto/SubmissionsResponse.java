package com.sttl.formbuilder.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class SubmissionsResponse {
    // Defines the table headers and types
    private List<FieldDto> columns;

    private List<Map<String, Object>> rows;
}