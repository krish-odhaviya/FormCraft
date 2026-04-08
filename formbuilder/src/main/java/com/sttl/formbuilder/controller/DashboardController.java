package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.constant.ApiEndpoints;
import com.sttl.formbuilder.dto.DashboardStatsResponse;
import com.sttl.formbuilder.service.DashboardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiEndpoints.DASHBOARD_BASE)
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping(ApiEndpoints.DASHBOARD_STATS)
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {
        
        DashboardStatsResponse stats = dashboardService.getStats(currentUser.getUsername());
        return ApiResponseUtil.success(stats, "Dashboard statistics fetched successfully", request);
    }
}
