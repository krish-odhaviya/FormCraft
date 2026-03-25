package com.sttl.formbuilder.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class PublishFormRequest {
    private List<AddFieldRequest> fields;
}
