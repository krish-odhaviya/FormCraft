package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AccessRequestDTO;
import com.sttl.formbuilder.entity.AccessRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.AccessRequestRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.PermissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class AccessRequestController {

    private final AccessRequestRepository requestRepository;
    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<ApiResponse<AccessRequest>> createRequest(
            @RequestBody AccessRequestDTO dto,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        AccessRequest request = new AccessRequest();
        request.setUser(user);
        request.setType(dto.getType());
        request.setReason(dto.getReason());
        request.setStatus("PENDING");
        request.setRequestedAt(LocalDateTime.now());

        if (dto.getFormId() != null) {
            Form form = formRepository.findById(dto.getFormId())
                    .orElseThrow(() -> new RuntimeException("Form not found"));
            request.setForm(form);
        }

        requestRepository.save(request);
        return ApiResponseUtil.success(request, "Request submitted successfully", httprequest);
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<AccessRequest>>> getMyRequests(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<AccessRequest> requests = requestRepository.findByUser(user);
        return ApiResponseUtil.success(requests, "Requests fetched successfully", httprequest);
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<AccessRequest>>> getPendingRequests(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!permissionService.canManageSystem(admin)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, httprequest);
        }

        List<AccessRequest> requests = requestRepository.findByStatus("PENDING");
        return ApiResponseUtil.success(requests, "Pending requests fetched successfully", httprequest);
    }

    @PostMapping("/{requestId}/process")
    public ResponseEntity<ApiResponse<AccessRequest>> processRequest(
            @PathVariable Long requestId,
            @RequestParam String status, // APPROVED, REJECTED
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User processor = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        AccessRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Only Admin can approve form creation. Builder can approve form access.
        if ("CREATE_FORM".equals(request.getType())) {
            if (!permissionService.canManageSystem(processor)) {
                return ApiResponseUtil.error("Only admins can approve creation requests", null, HttpStatus.FORBIDDEN, httprequest);
            }
        } else {
            if (!permissionService.canApproveFormRequests(processor, request.getForm())) {
                return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, httprequest);
            }
        }

        request.setStatus(status);
        request.setProcessedBy(processor);
        request.setProcessedAt(LocalDateTime.now());

        requestRepository.save(request);
        
        // TODO: If APPROVED, grant actual permission (e.g. create FormPermission entry)
        
        return ApiResponseUtil.success(request, "Request processed successfully", httprequest);
    }
}
