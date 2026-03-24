package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.UserResponseDto;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.sttl.formbuilder.service.ModuleAccessService.MODULE_USER_MANAGEMENT;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository      userRepository;
    private final PermissionService   permissionService;
    private final RoleService         roleService;
    private final ModuleAccessService moduleAccessService;  // ← ADDED

    /**
     * Returns all users. Caller must be a system admin.
     * Requires: "User Management" module.
     */
    public List<UserResponseDto> getAllUsers(String adminUsername) {
        moduleAccessService.assertHasModule(adminUsername, MODULE_USER_MANAGEMENT);  // ← ADDED
        User admin = resolveAdmin(adminUsername);
        assertSystemAdmin(admin);

        return userRepository.findAll().stream()
                .map(u -> toDto(u))
                .toList();
    }

    /**
     * Assigns a custom role to a user. Caller must be a system admin.
     * Requires: "User Management" module.
     */
    @Transactional
    public UserResponseDto updateUserRole(String adminUsername, java.util.UUID userId, java.util.UUID roleId) {
        moduleAccessService.assertHasModule(adminUsername, MODULE_USER_MANAGEMENT);  // ← ADDED
        User admin = resolveAdmin(adminUsername);
        assertSystemAdmin(admin);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        roleService.assignRoleToUser(userId, roleId);

        // Refresh user data after role assignment
        User updated = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        return toDto(updated);
    }

    /**
     * Enables or disables a user account. Caller must be a system admin.
     * Requires: "User Management" module.
     */
    @Transactional
    public UserResponseDto toggleUserStatus(String adminUsername, java.util.UUID userId, boolean enabled) {
        moduleAccessService.assertHasModule(adminUsername, MODULE_USER_MANAGEMENT);  // ← ADDED
        User admin = resolveAdmin(adminUsername);
        assertSystemAdmin(admin);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (user.getId().equals(admin.getId())) {
            throw new BusinessException("You cannot disable your own account", HttpStatus.FORBIDDEN);
        }

        if (permissionService.isSystemAdmin(user)) {
            throw new BusinessException("You cannot disable another administrator", HttpStatus.FORBIDDEN);
        }

        user.setEnabled(enabled);
        userRepository.save(user);

        return toDto(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User resolveAdmin(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("Admin user not found", HttpStatus.NOT_FOUND));
    }

    private void assertSystemAdmin(User user) {
        if (!permissionService.canManageSystem(user)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }
    }

    private UserResponseDto toDto(User user) {
        return new UserResponseDto(
                user.getId(),
                user.getUsername(),
                user.isEnabled(),
                roleService.getUserRoleName(user),
                roleService.getCustomRoleId(user)
        );
    }
}