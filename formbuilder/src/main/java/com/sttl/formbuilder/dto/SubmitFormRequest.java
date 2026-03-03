package com.sttl.formbuilder.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;


@Getter
@Setter
public class SubmitFormRequest {

    private Long versionId;

    private Map<String, Object> values;
}
