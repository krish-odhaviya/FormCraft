package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.UserResponseDto;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    /**
     * GET /api/admin/users
     * Returns all registered users. Requires system admin role.
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> getAllUsers(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        List<UserResponseDto> users = adminService.getAllUsers(currentUser.getUsername());
        return ApiResponseUtil.success(users, "Users fetched successfully", request);
    }

    /**
     * POST /api/admin/users/{userId}/custom-role?roleId=
     * Assigns a custom role to the given user. Requires system admin role.
     */
    @PostMapping("/users/{userId}/custom-role")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateUserCustomRole(
            @PathVariable java.util.UUID userId,
            @RequestParam java.util.UUID roleId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        UserResponseDto dto = adminService.updateUserRole(currentUser.getUsername(), userId, roleId);
        return ApiResponseUtil.success(dto, "User custom role updated successfully", request);
    }

    /**
     * POST /api/admin/users/{userId}/enable?enabled=true|false
     * Enables or disables a user account. Requires system admin role.
     */
    @PostMapping("/users/{userId}/enable")
    public ResponseEntity<ApiResponse<UserResponseDto>> toggleUserStatus(
            @PathVariable java.util.UUID userId,
            @RequestParam boolean enabled,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest request) {

        assertAuthenticated(currentUser);
        UserResponseDto dto = adminService.toggleUserStatus(currentUser.getUsername(), userId, enabled);
        return ApiResponseUtil.success(dto, "User status updated successfully", request);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void assertAuthenticated(UserDetails currentUser) {
        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
    }
}