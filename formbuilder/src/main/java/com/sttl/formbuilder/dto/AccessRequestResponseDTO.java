package com.sttl.formbuilder.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessRequestResponseDTO {
    private Long id;
    private UserInfo user;
    private FormInfo form;
    private String type;
    private String reason;
    private String status;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;
    private UserInfo processedBy;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FormInfo {
        private Long id;
        private String name;
    }
}
