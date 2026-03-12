package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.Enums.SystemRole;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.PermissionService;
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

    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!permissionService.canManageSystem(admin)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, httprequest);
        }

        List<User> users = userRepository.findAll();
        return ApiResponseUtil.success(users, "Users fetched successfully", httprequest);
    }

    @PostMapping("/users/{userId}/role")
    public ResponseEntity<ApiResponse<User>> updateUserRole(
            @PathVariable Long userId,
            @RequestParam SystemRole role,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!permissionService.canManageSystem(admin)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, httprequest);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(role);
        userRepository.save(user);

        return ApiResponseUtil.success(user, "User role updated successfully", httprequest);
    }

    @PostMapping("/users/{userId}/enable")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(
            @PathVariable Long userId,
            @RequestParam boolean enabled,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!permissionService.canManageSystem(admin)) {
            return ApiResponseUtil.error("Access denied", null, HttpStatus.FORBIDDEN, httprequest);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setEnabled(enabled);
        userRepository.save(user);

        return ApiResponseUtil.success(user, "User status updated successfully", httprequest);
    }
}
