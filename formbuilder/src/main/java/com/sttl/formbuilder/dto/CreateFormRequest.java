package com.sttl.formbuilder.dto;

import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
@Getter
@Setter
public class CreateFormRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    private String description;
}