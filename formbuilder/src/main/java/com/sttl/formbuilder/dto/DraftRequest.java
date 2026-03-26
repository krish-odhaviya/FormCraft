package com.sttl.formbuilder.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class DraftRequest {
    private UUID formId;
    private UUID formVersionId;
    private Map<String, Object> data;
}
