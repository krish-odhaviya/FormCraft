package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.constant.ApiEndpoints;
import com.sttl.formbuilder.dto.RegisterUserRequest;
import com.sttl.formbuilder.dto.UserResponseDto;
import com.sttl.formbuilder.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.AUTH_BASE)
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping(ApiEndpoints.LOGIN)
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response) {

        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ApiResponseUtil.error(
                    "Username and password are required",
                    null,
                    HttpStatus.BAD_REQUEST,
                    request
            );
        }

        try {
            Authentication authentication = authService.login(username, password);

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            HttpSession session = request.getSession(true);
            session.setAttribute(
                    HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    context
            );

            return ApiResponseUtil.success(
                    authService.buildUserData(authentication),
                    "Login successful",
                    request
            );

        } catch (BadCredentialsException ex) {
            return ApiResponseUtil.error(
                    "Invalid username or password",
                    null,
                    HttpStatus.UNAUTHORIZED,
                    request
            );
        } catch (DisabledException ex) {
            return ApiResponseUtil.error(
                    "You are disabled by admin",
                    null,
                    HttpStatus.FORBIDDEN,
                    request
            );
        }
    }

    @PostMapping(ApiEndpoints.LOGOUT)
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ApiResponseUtil.success(null, "Logged out successfully", request);
    }

    @GetMapping(ApiEndpoints.ME)
    public ResponseEntity<?> me(
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) {

        if (userDetails == null) {
            return ApiResponseUtil.error(
                    "Not authenticated",
                    null,
                    HttpStatus.UNAUTHORIZED,
                    request
            );
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ApiResponseUtil.success(
                authService.buildUserData(auth),
                "Authenticated",
                request
        );
    }

    @PostMapping(ApiEndpoints.REGISTER)
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterUserRequest body,
            HttpServletRequest request) {

        UserResponseDto dto = authService.register(body);
        return ApiResponseUtil.success(dto, "Account created successfully", request);
    }
}