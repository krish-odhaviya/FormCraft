package com.sttl.formbuilder.common;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiErrorDetail {

    private String field;
    private String message;
}
