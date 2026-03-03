package com.sttl.formbuilder.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Data;

@Data
public class FormDetailsResponse {

    private Long id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<VersionDto> versions;




}
