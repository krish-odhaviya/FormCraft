package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.RegisterUserRequest;
import com.sttl.formbuilder.dto.UserResponseDto;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.RoleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.sttl.formbuilder.repository.UserRoleRepository userRoleRepository;
    private final com.sttl.formbuilder.repository.RoleRepository roleRepository;
    private final RoleService roleService;


    /**
     * POST /api/auth/login
     * Body: { "username": "admin", "password": "admin123" }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response) {

        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Username and password are required"
            ));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            // Store auth in security context and bind to HTTP session
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            HttpSession session = request.getSession(true);
            session.setAttribute(
                    HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    context
            );

            Map<String, Object> userData = buildUserData(authentication);
            return ApiResponseUtil.success(userData, "Login successful", request);

        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Invalid username or password"
            ));
        }
    }

    /**
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully"));
    }

    /**
     * GET /api/auth/me  — returns currently logged-in user info (or 401)
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Not authenticated"
            ));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> userData = buildUserData(auth);
        return ApiResponseUtil.success(userData, "Authenticated", request);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/register  (PUBLIC — no session required)
     * Anyone can create an account. Each account gets ROLE_ADMIN so they can
     * immediately build and manage their own forms.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterUserRequest body,
            HttpServletRequest request) {

        String username = body.getUsername().trim();

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "message", "Username '" + username + "' is already taken"
            ));
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(body.getPassword()));
        user.setRole(com.sttl.formbuilder.Enums.SystemRole.EMPLOYEE);
        user.setEnabled(true);
        User savedUser = userRepository.save(user);

        // Assign "Project manager" role by default
        roleRepository.findByRoleName("Project manager").ifPresent(role -> {
            com.sttl.formbuilder.entity.UserRole ur = new com.sttl.formbuilder.entity.UserRole();
            ur.setUser(savedUser);
            ur.setRole(role);
            userRoleRepository.save(ur);
        });

        UserResponseDto dto = new UserResponseDto(
                savedUser.getId(), savedUser.getUsername(), savedUser.getRole(), savedUser.isEnabled(), roleService.getUserRoleName(savedUser), roleService.getCustomRoleId(savedUser));

        return ApiResponseUtil.success(dto, "Account created successfully", request);
    }

    private Map<String, Object> buildUserData(Authentication authentication) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("username", authentication.getName());
        
        userRepository.findByUsername(authentication.getName()).ifPresent(user -> {
            data.put("id", user.getId());
            data.put("role", user.getRole().name());

            userRoleRepository.findFirstByUser(user).ifPresent(ur -> {
                com.sttl.formbuilder.entity.Role customRole = ur.getRole();
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
