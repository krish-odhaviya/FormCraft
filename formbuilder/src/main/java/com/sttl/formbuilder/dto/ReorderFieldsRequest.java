package com.sttl.formbuilder.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;
import java.util.List;

@Getter
@Setter
public class ReorderFieldsRequest {

    @NotEmpty(message = "Field IDs list cannot be empty")
    @Size(max = 500, message = "Cannot reorder more than 500 fields at once")
    private List<UUID> fieldIds;
}