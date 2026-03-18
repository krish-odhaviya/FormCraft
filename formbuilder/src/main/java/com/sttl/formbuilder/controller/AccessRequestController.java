package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormRole;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AccessRequestDTO;
import com.sttl.formbuilder.dto.AccessRequestResponseDTO;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.service.AccessRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class AccessRequestController {

    private final AccessRequestService accessRequestService;

    /**
     * POST /api/requests
     * Submits a new access request (VIEW_FORM or CREATE_FORM).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<AccessRequestResponseDTO>> createRequest(
            @Valid @RequestBody AccessRequestDTO dto,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        AccessRequestResponseDTO response = accessRequestService.createRequest(currentUser.getUsername(), dto);
        return ApiResponseUtil.success(response, "Request submitted successfully", request);
    }

    /**
     * GET /api/requests/my
     * Returns all requests submitted by the currently logged-in user.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<AccessRequestResponseDTO>>> getMyRequests(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        List<AccessRequestResponseDTO> requests = accessRequestService.getMyRequests(currentUser.getUsername());
        return ApiResponseUtil.success(requests, "Requests fetched successfully", request);
    }

    /**
     * GET /api/requests/pending
     * Admins see all pending requests. Form owners see requests for their own forms.
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<AccessRequestResponseDTO>>> getPendingRequests(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        List<AccessRequestResponseDTO> requests = accessRequestService.getPendingRequests(currentUser.getUsername());
        return ApiResponseUtil.success(requests, "Pending requests fetched successfully", request);
    }

    /**
     * POST /api/requests/{requestId}/process?status=APPROVED|REJECTED&role=VIEWER|BUILDER
     * Approves or rejects an access request.
     */
    @PostMapping("/{requestId}/process")
    public ResponseEntity<ApiResponse<AccessRequestResponseDTO>> processRequest(
            @PathVariable Long requestId,
            @RequestParam String status,
            @RequestParam(required = false) FormRole role,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        AccessRequestResponseDTO response = accessRequestService.processRequest(
                currentUser.getUsername(), requestId, status, role);
        return ApiResponseUtil.success(response, "Request processed successfully", request);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void assertAuthenticated(UserDetails currentUser) {
        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
    }
}