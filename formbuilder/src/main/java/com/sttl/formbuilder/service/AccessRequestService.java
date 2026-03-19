package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormRole;
import com.sttl.formbuilder.dto.AccessRequestDTO;
import com.sttl.formbuilder.dto.AccessRequestResponseDTO;
import com.sttl.formbuilder.entity.AccessRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.AccessRequestRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static com.sttl.formbuilder.service.ModuleAccessService.*;

@Service
@RequiredArgsConstructor
public class AccessRequestService {

    private final AccessRequestRepository requestRepository;
    private final FormRepository          formRepository;
    private final UserRepository          userRepository;
    private final PermissionService       permissionService;
    private final ModuleAccessService     moduleAccessService;  // ← ADDED

    /**
     * Creates a new access request (VIEW_FORM or CREATE_FORM) for the given user.
     * Requires: "My Requests" module.
     */
    @Transactional
    public AccessRequestResponseDTO createRequest(String username, AccessRequestDTO dto) {
        moduleAccessService.assertHasModule(username, MODULE_MY_REQUESTS);  // ← ADDED

        User user = resolveUser(username);

        AccessRequest request = new AccessRequest();
        request.setUser(user);
        request.setType(dto.getType());
        request.setReason(dto.getReason());
        request.setStatus("PENDING");
        request.setRequestedAt(LocalDateTime.now());

        if (dto.getFormId() != null) {
            Form form = formRepository.findById(dto.getFormId())
                    .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));

            boolean alreadyExists = requestRepository.existsByUserAndFormAndStatusIn(
                    user, form, List.of("PENDING", "APPROVED"));
            if (alreadyExists) {
                throw new BusinessException(
                        "You already have a pending or approved request for this form",
                        HttpStatus.CONFLICT
                );
            }

            request.setForm(form);
        }

        requestRepository.save(request);
        return toDto(request);
    }

    /**
     * Returns all access requests submitted by the given user.
     * Requires: "My Requests" module.
     */
    public List<AccessRequestResponseDTO> getMyRequests(String username) {
        moduleAccessService.assertHasModule(username, MODULE_MY_REQUESTS);  // ← ADDED

        User user = resolveUser(username);
        return requestRepository.findByUser(user).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns pending requests:
     * - Admins see all pending requests (requires "All Access Requests" module).
     * - Form owners see pending requests for their forms (requires "Form Request" module).
     */
    public List<AccessRequestResponseDTO> getPendingRequests(String username) {
        User user = resolveUser(username);

        // ── ADDED: module check per caller type ───────────────────────────────
        if (permissionService.canManageSystem(user)) {
            moduleAccessService.assertHasModule(username, MODULE_ALL_REQUESTS);
        } else {
            moduleAccessService.assertHasModule(username, MODULE_FORM_REQUEST);
        }
        // ─────────────────────────────────────────────────────────────────────

        List<AccessRequest> requests = permissionService.canManageSystem(user)
                ? requestRepository.findByStatus("PENDING")
                : requestRepository.findByFormOwnerAndStatus(user, "PENDING");

        return requests.stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Approves or rejects an access request.
     * - Only admins can approve CREATE_FORM requests (requires "All Access Requests" module).
     * - Form owners/builders can approve VIEW_FORM requests (requires "Form Request" module).
     */
    @Transactional
    public AccessRequestResponseDTO processRequest(
            String processorUsername,
            Long requestId,
            String status,
            FormRole role) {

        User processor = resolveUser(processorUsername);

        AccessRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Request not found", HttpStatus.NOT_FOUND));

        if ("CREATE_FORM".equals(request.getType())) {
            if (!permissionService.canManageSystem(processor)) {
                throw new BusinessException("Only admins can approve creation requests", HttpStatus.FORBIDDEN);
            }
            moduleAccessService.assertHasModule(processorUsername, MODULE_ALL_REQUESTS);  // ← ADDED
        } else {
            if (!permissionService.canApproveFormRequests(processor, request.getForm())) {
                throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
            }
            // ── ADDED: accept either module — admin or form owner path ────────
            boolean hasAccess =
                    moduleAccessService.hasModule(processorUsername, MODULE_ALL_REQUESTS) ||
                            moduleAccessService.hasModule(processorUsername, MODULE_FORM_REQUEST);
            if (!hasAccess) {
                throw new BusinessException(
                        "Access denied: your role does not include the request management feature",
                        HttpStatus.FORBIDDEN);
            }
            // ─────────────────────────────────────────────────────────────────
        }

        request.setStatus(status);
        request.setProcessedBy(processor);
        request.setProcessedAt(LocalDateTime.now());
        requestRepository.save(request);

        if ("APPROVED".equals(status) && request.getForm() != null) {
            FormRole roleToGrant = (role != null) ? role : FormRole.VIEWER;
            permissionService.grantFormRole(processor, request.getUser(), request.getForm(), roleToGrant, null);
        }

        return toDto(request);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User resolveUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
    }

    private AccessRequestResponseDTO toDto(AccessRequest request) {
        return AccessRequestResponseDTO.builder()
                .id(request.getId())
                .user(new AccessRequestResponseDTO.UserInfo(
                        request.getUser().getId(),
                        request.getUser().getUsername()))
                .form(request.getForm() != null
                        ? new AccessRequestResponseDTO.FormInfo(
                        request.getForm().getId(),
                        request.getForm().getName())
                        : null)
                .type(request.getType())
                .reason(request.getReason())
                .status(request.getStatus())
                .requestedAt(request.getRequestedAt())
                .processedAt(request.getProcessedAt())
                .processedBy(request.getProcessedBy() != null
                        ? new AccessRequestResponseDTO.UserInfo(
                        request.getProcessedBy().getId(),
                        request.getProcessedBy().getUsername())
                        : null)
                .build();
    }
}