package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.FormRole;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.AccessRequestDTO;
import com.sttl.formbuilder.dto.AccessRequestResponseDTO;
import com.sttl.formbuilder.entity.AccessRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
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
    public ResponseEntity<ApiResponse<AccessRequestResponseDTO>> createRequest(
            @RequestBody AccessRequestDTO dto,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        AccessRequest request = new AccessRequest();
        request.setUser(user);
        request.setType(dto.getType());
        request.setReason(dto.getReason());
        request.setStatus("PENDING");
        request.setRequestedAt(LocalDateTime.now());

        if (dto.getFormId() != null) {
            Form form = formRepository.findById(dto.getFormId())
                    .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
            
            // Duplicate Check: User should not have a pending or approved request for this form
            boolean exists = requestRepository.existsByUserAndFormAndStatusIn(
                    user, form, List.of("PENDING", "APPROVED"));
            if (exists) {
                throw new BusinessException("You already have a pending or approved request for this form", HttpStatus.CONFLICT);
            }
            
            request.setForm(form);
        }

        requestRepository.save(request);
        return ApiResponseUtil.success(mapToDTO(request), "Request submitted successfully", httprequest);
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<AccessRequestResponseDTO>>> getMyRequests(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        List<AccessRequestResponseDTO> requests = requestRepository.findByUser(user).stream()
                .map(this::mapToDTO)
                .toList();
        return ApiResponseUtil.success(requests, "Requests fetched successfully", httprequest);
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<AccessRequestResponseDTO>>> getPendingRequests(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User user = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        List<AccessRequest> requests;
        if (permissionService.canManageSystem(user)) {
            // Admins see all pending requests
            requests = requestRepository.findByStatus("PENDING");
        } else {
            // Regular users (Owners) see pending requests for forms they own
            requests = requestRepository.findByFormOwnerAndStatus(user, "PENDING");
        }

        List<AccessRequestResponseDTO> responseDtos = requests.stream()
                .map(this::mapToDTO)
                .toList();
        return ApiResponseUtil.success(responseDtos, "Pending requests fetched successfully", httprequest);
    }

    @PostMapping("/{requestId}/process")
    public ResponseEntity<ApiResponse<AccessRequestResponseDTO>> processRequest(
            @PathVariable Long requestId,
            @RequestParam String status, // APPROVED, REJECTED
            @RequestParam(required = false) FormRole role, // Role to grant if APPROVED
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User processor = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        AccessRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Request not found", HttpStatus.NOT_FOUND));

        // Only Admin can approve form creation. Builder can approve form access.
        if ("CREATE_FORM".equals(request.getType())) {
            if (!permissionService.canManageSystem(processor)) {
                throw new BusinessException("Only admins can approve creation requests", HttpStatus.FORBIDDEN);
            }
        } else {
            if (!permissionService.canApproveFormRequests(processor, request.getForm())) {
                throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
            }
        }

        request.setStatus(status);
        request.setProcessedBy(processor);
        request.setProcessedAt(LocalDateTime.now());

        requestRepository.save(request);
        
        // If APPROVED, grant actual permission
        if ("APPROVED".equals(status)) {
            if (request.getForm() != null) {
                // If role not provided, default to VIEWER (safe choice)
                FormRole roleToGrant = (role != null) ? role : FormRole.VIEWER;
                permissionService.grantFormRole(processor, request.getUser(), request.getForm(), roleToGrant, null);
            }
        }
        
        return ApiResponseUtil.success(mapToDTO(request), "Request processed successfully", httprequest);
    }

    private AccessRequestResponseDTO mapToDTO(AccessRequest request) {
        return AccessRequestResponseDTO.builder()
                .id(request.getId())
                .user(new AccessRequestResponseDTO.UserInfo(request.getUser().getId(), request.getUser().getUsername()))
                .form(request.getForm() != null ? new AccessRequestResponseDTO.FormInfo(request.getForm().getId(), request.getForm().getName()) : null)
                .type(request.getType())
                .reason(request.getReason())
                .status(request.getStatus())
                .requestedAt(request.getRequestedAt())
                .processedAt(request.getProcessedAt())
                .processedBy(request.getProcessedBy() != null ? new AccessRequestResponseDTO.UserInfo(request.getProcessedBy().getId(), request.getProcessedBy().getUsername()) : null)
                .build();
    }
}
