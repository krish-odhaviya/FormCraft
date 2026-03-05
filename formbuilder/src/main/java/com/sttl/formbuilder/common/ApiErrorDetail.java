package com.sttl.formbuilder.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;

@Data
@Getter
@AllArgsConstructor
public class ApiErrorDetail {

    private String field;
    private String message;
}
