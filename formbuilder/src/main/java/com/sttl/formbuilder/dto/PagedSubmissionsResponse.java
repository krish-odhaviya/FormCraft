package com.sttl.formbuilder.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;


@Data
public class PagedSubmissionsResponse {
    private List<FieldDto> columns;
    private List<Map<String, Object>> rows;
    private long totalElements;   // total matching rows across ALL pages
    private long totalPages;
    private int page;
    private int size;
}