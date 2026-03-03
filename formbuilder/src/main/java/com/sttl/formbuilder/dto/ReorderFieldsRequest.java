package com.sttl.formbuilder.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReorderFieldsRequest {

    @NotEmpty
    private List<Long> fieldIds;
}
