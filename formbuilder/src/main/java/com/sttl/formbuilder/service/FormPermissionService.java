package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormRole;
import com.sttl.formbuilder.Enums.VisibilityType;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormPermission;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormPermissionRepository;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormPermissionService {

    private final FormRepository formRepository;
    private final UserRepository userRepository;
    private final FormPermissionRepository permissionRepository;
    private final PermissionService permissionService;

    /**
     * Returns all permissions for a form. Caller must have configure access.
     */
    public List<Map<String, Object>> getFormPermissions(String username, Long formId) {
        Form form = resolveForm(formId);
        User user = resolveUser(username);

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        return permissionRepository.findByForm(form).stream()
                .map(this::toPermissionMap)
                .collect(Collectors.toList());
    }

    /**
     * Grants a form role to a target user. Caller must have configure access.
     */
    @Transactional
    public void addPermission(String granterUsername, Long formId, String targetUsername, FormRole role) {
        Form form = resolveForm(formId);
        User granter = resolveUser(granterUsername);

        if (!permissionService.canConfigureForm(granter, form)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new BusinessException("User not found: " + targetUsername, HttpStatus.NOT_FOUND));

        permissionService.grantFormRole(granter, targetUser, form, role, null);
    }

    /**
     * Removes a permission by ID. Caller must have configure access.
     */
    @Transactional
    public void removePermission(String username, Long formId, Long permissionId) {
        Form form = resolveForm(formId);
        User user = resolveUser(username);

        if (!permissionService.canConfigureForm(user, form)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        permissionRepository.deleteById(permissionId);
    }

    /**
     * Updates the visibility of a form. Caller must be the owner or an admin.
     */
    @Transactional
    public void updateVisibility(String username, Long formId, VisibilityType visibility) {
        Form form = resolveForm(formId);
        User user = resolveUser(username);

        if (!permissionService.isOwnerOrAdmin(user, form)) {
            throw new BusinessException("Access denied: only owner or admin can change visibility", HttpStatus.FORBIDDEN);
        }

        form.setVisibility(visibility);
        formRepository.save(form);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Form resolveForm(Long formId) {
        return formRepository.findById(formId)
                .orElseThrow(() -> new BusinessException("Form not found", HttpStatus.NOT_FOUND));
    }

    private User resolveUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }

    private Map<String, Object> toPermissionMap(FormPermission p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("userId", p.getUser().getId());
        m.put("username", p.getUser().getUsername());
        m.put("role", p.getRole().name());
        m.put("grantedAt", p.getGrantedAt());
        return m;
    }
}