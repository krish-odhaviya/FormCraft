package com.sttl.formbuilder.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class DashboardStatsResponse {
    private long totalForms;
    private long draftForms;
    private long publishedForms;
    private long totalSubmissions;
    private List<RecentFormDto> recentForms;

    @Data
    @Builder
    public static class RecentFormDto {
        private UUID id;
        private String formName;
        private String status;
        private LocalDateTime updatedAt;
    }
}
