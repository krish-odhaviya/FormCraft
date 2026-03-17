package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.UserResponseDto;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.PermissionService;
import com.sttl.formbuilder.service.RoleService;
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
    private final RoleService roleService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> getAllUsers(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("Admin user not found", HttpStatus.NOT_FOUND));

        if (!permissionService.canManageSystem(admin)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        List<UserResponseDto> users = userRepository.findAll().stream()
                .map(u -> new UserResponseDto(u.getId(), u.getUsername(), u.isEnabled(), roleService.getUserRoleName(u), roleService.getCustomRoleId(u)))
                .toList();
        return ApiResponseUtil.success(users, "Users fetched successfully", httprequest);
    }


    @PostMapping("/users/{userId}/custom-role")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateUserCustomRole(
            @PathVariable Long userId,
            @RequestParam Long roleId,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("Admin user not found", HttpStatus.NOT_FOUND));

        if (!permissionService.canManageSystem(admin)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        roleService.assignRoleToUser(userId, roleId);
        
        UserResponseDto dto = new UserResponseDto(user.getId(), user.getUsername(), user.isEnabled(), roleService.getUserRoleName(user), roleService.getCustomRoleId(user));
        return ApiResponseUtil.success(dto, "User custom role updated successfully", httprequest);
    }

    @PostMapping("/users/{userId}/enable")
    public ResponseEntity<ApiResponse<UserResponseDto>> toggleUserStatus(
            @PathVariable Long userId,
            @RequestParam boolean enabled,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest httprequest) {

        if (currentUser == null) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        User admin = userRepository.findByUsername(currentUser.getUsername())
                .orElseThrow(() -> new BusinessException("Admin user not found", HttpStatus.NOT_FOUND));

        if (!permissionService.canManageSystem(admin)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        user.setEnabled(enabled);
        userRepository.save(user);

        UserResponseDto dto = new UserResponseDto(user.getId(), user.getUsername(), user.isEnabled(), roleService.getUserRoleName(user), roleService.getCustomRoleId(user));
        return ApiResponseUtil.success(dto, "User status updated successfully", httprequest);
    }
}
