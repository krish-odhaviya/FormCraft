package com.sttl.formbuilder.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;


@Getter
@Setter
public class SubmitFormRequest {

    private Long formId;

    private Map<String, Object> values;
}
