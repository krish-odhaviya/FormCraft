package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.RegisterUserRequest;
import com.sttl.formbuilder.dto.UserResponseDto;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.entity.UserRole;
import com.sttl.formbuilder.entity.Role;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.RoleRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleService roleService;

    /**
     * Authenticates user and returns user data map.
     */
    public Authentication login(String username, String password) {
        return authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );
    }

    /**
     * Registers a new user, assigns default role, and returns the saved user DTO.
     */
    @Transactional
    public UserResponseDto register(RegisterUserRequest body) {
        String username = body.getUsername().trim();

        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(
                    "Username '" + username + "' is already taken",
                    HttpStatus.CONFLICT
            );
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(body.getPassword()));
        user.setEnabled(true);
        User savedUser = userRepository.save(user);

        // Assign "PROJECT_MANAGER" role by default
        roleRepository.findByRoleName("PROJECT_MANAGER").ifPresent(role -> {
            UserRole ur = new UserRole();
            ur.setUser(savedUser);
            ur.setRole(role);
            userRoleRepository.save(ur);
        });

        return new UserResponseDto(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.isEnabled(),
                roleService.getUserRoleName(savedUser),
                roleService.getCustomRoleId(savedUser)
        );
    }

    /**
     * Builds user data map from an Authentication object.
     */
    public Map<String, Object> buildUserData(Authentication authentication) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("username", authentication.getName());

        userRepository.findByUsername(authentication.getName()).ifPresent(user -> {
            data.put("id", user.getId());

            userRoleRepository.findFirstByUser(user).ifPresent(ur -> {
                Role customRole = ur.getRole();
                data.put("customRole", customRole.getRoleName());
                data.put("canCreateForm", customRole.isCanCreateForm());
                data.put("canEditForm", customRole.isCanEditForm());
                data.put("canDeleteForm", customRole.isCanDeleteForm());
                data.put("canArchiveForm", customRole.isCanArchiveForm());
                data.put("canViewSubmissions", customRole.isCanViewSubmissions());
                data.put("canDeleteSubmissions", customRole.isCanDeleteSubmissions());
            });
        });

        data.put("roles", authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .toList());

        return data;
    }
}