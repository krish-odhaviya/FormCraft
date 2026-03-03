package com.sttl.formbuilder.common;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ApiMeta {

    private LocalDateTime timestamp;
    private int status;
    private String path;
    private String requestId;
    private String apiVersion;

}
