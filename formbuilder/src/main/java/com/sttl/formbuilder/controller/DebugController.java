package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.service.PermissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
public class DebugController {

    private final FormRepository formRepository;
    private final PermissionService permissionService;
    private final UserRepository userRepository;

    @GetMapping("/access/{formId}")
    public ResponseEntity<?> debugAccess(@PathVariable Long formId, @AuthenticationPrincipal UserDetails currentUser, HttpServletRequest request) {
        Form form = formRepository.findById(formId).orElse(null);
        if (form == null) return ResponseEntity.notFound().build();

        User user = currentUser != null ? userRepository.findByUsername(currentUser.getUsername()).orElse(null) : null;

        Map<String, Object> debug = new LinkedHashMap<>();
        debug.put("formId", formId);
        debug.put("visibility", form.getVisibility());
        debug.put("owner", form.getOwner() != null ? form.getOwner().getUsername() : "NONE");
        debug.put("currentUser", user != null ? user.getUsername() : "ANONYMOUS");
        debug.put("canView", permissionService.canViewForm(user, form));
        
        return ApiResponseUtil.success(debug, "Debug access info", request);
    }
}
