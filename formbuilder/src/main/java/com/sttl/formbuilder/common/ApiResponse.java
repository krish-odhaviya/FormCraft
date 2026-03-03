package com.sttl.formbuilder.common;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private List<ApiErrorDetail> errors;
    private ApiMeta meta;
}
