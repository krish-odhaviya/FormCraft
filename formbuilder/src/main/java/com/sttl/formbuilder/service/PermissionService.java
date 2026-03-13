package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormRole;
import com.sttl.formbuilder.Enums.SystemRole;
import com.sttl.formbuilder.Enums.VisibilityType;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormPermission;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.FormPermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final FormPermissionRepository permissionRepository;
    private final com.sttl.formbuilder.repository.UserRoleRepository userRoleRepository;


    public boolean canViewForm(User user, Form form) {
        if (form == null) return false;
        VisibilityType vis = form.getVisibility() != null ? form.getVisibility() : VisibilityType.PUBLIC;
        
        System.out.println("Checking canViewForm: user=" + (user != null ? user.getUsername() : "ANONYMOUS") + 
                           " form=" + form.getId() + " visibility=" + vis);
        
        if (vis == VisibilityType.PUBLIC) {
            System.out.println("  PUBLIC form - access granted");
            return true;
        }
        if (user == null) {
            System.out.println("  Anonymous user on non-public form - access denied");
            return false;
        }
        if (user.getRole() == SystemRole.ADMIN) {
            System.out.println("  ADMIN user - access granted");
            return true;
        }
        // Owner always has access
        if (form.getOwner() != null && user != null && form.getOwner().getId().equals(user.getId())) {
            System.out.println("  OWNER user - access granted");
            return true;
        }
        if (vis == VisibilityType.LINK) {
            System.out.println("  LINK form - access granted to authenticated user=" + user.getUsername());
            return true; // Authenticated users can view LINK forms
        }
        // RESTRICTED: Check explicit permission
        boolean hasRole = hasFormRole(user, form, null);
        System.out.println("  RESTRICTED form - checking permissions for user=" + user.getUsername() + ": result=" + hasRole);
        return hasRole; // Any role (VIEWER or BUILDER)
    }

    public boolean canSubmitForm(User user, Form form) {
        // Same as view for now, as requirements say "Can view and submit"
        return canViewForm(user, form);
    }

    public boolean canConfigureForm(User user, Form form) {
        if (user == null) return false;
        if (user.getRole() == SystemRole.ADMIN) return true;
        
        boolean canEdit = userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().isCanEditForm())
                .orElse(false);
        if (!canEdit) return false;

        // Check if user is the owner or has BUILDER role
        if (form.getOwner() != null && form.getOwner().getId().equals(user.getId())) {
            return true;
        }
        
        return hasFormRole(user, form, FormRole.BUILDER);
    }

    public boolean canCreateForm(User user) {
        if (user == null) return false;
        if (user.getRole() == SystemRole.ADMIN) return true;
        
        return userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().isCanCreateForm())
                .orElse(false);
    }

    public boolean canArchiveForm(User user, Form form) {
        if (user == null) return false;
        if (user.getRole() == SystemRole.ADMIN) return true;

        boolean canArchive = userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().isCanArchiveForm())
                .orElse(false);
        if (!canArchive) return false;

        // Ensure they also own/have access to this specific form
        if (form.getOwner() != null && form.getOwner().getId().equals(user.getId())) {
            return true;
        }
        return hasFormRole(user, form, FormRole.BUILDER);
    }

    public boolean canViewSubmissions(User user, Form form) {
        if (user == null) return false;
        if (user.getRole() == SystemRole.ADMIN) return true;
        
        boolean globalCanView = userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().isCanViewSubmissions())
                .orElse(false);
        if (!globalCanView) return false;

        // Check if user is owner/builder, OR if they're a VIEWER
        if (form.getOwner() != null && form.getOwner().getId().equals(user.getId())) {
            return true;
        }
        
        return hasFormRole(user, form, null);
    }

    public boolean canDeleteSubmissions(User user, Form form) {
        if (user == null) return false;
        if (user.getRole() == SystemRole.ADMIN) return true;
        
        boolean globalCanDelete = userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().isCanDeleteSubmissions())
                .orElse(false);
        if (!globalCanDelete) return false;

        // Must be owner or builder
        if (form.getOwner() != null && form.getOwner().getId().equals(user.getId())) {
            return true;
        }
        
        return hasFormRole(user, form, FormRole.BUILDER);
    }

    public boolean canManageSystem(User user) {
        return user != null && user.getRole() == SystemRole.ADMIN;
    }

    public void grantFormRole(User grantor, User user, Form form, FormRole role, LocalDateTime expiry) {
        if (!canApproveFormRequests(grantor, form)) {
            throw new BusinessException("Access denied: you cannot grant permissions for this form", HttpStatus.FORBIDDEN);
        }

        FormPermission perm = permissionRepository.findByUserAndForm(user, form)
                .orElse(new FormPermission());
        
        perm.setUser(user);
        perm.setForm(form);
        perm.setRole(role);
        perm.setExpiryDate(expiry);
        perm.setGrantedBy(grantor);
        perm.setGrantedAt(LocalDateTime.now());

        permissionRepository.save(perm);
    }

    public boolean canApproveFormRequests(User user, Form form) {
        return canConfigureForm(user, form);
    }

    public boolean isOwnerOrAdmin(User user, Form form) {
        if (user == null || form == null) return false;
        if (user.getRole() == SystemRole.ADMIN) return true;
        return form.getOwner() != null && form.getOwner().getId().equals(user.getId());
    }

    private boolean hasFormRole(User user, Form form, FormRole requiredRole) {
        if (user == null || form == null) return false;
        
        System.out.println("    Checking hasFormRole: user=" + user.getUsername() + " form=" + form.getId() + " required=" + requiredRole);
        Optional<FormPermission> permOpt = permissionRepository.findByUserAndForm(user, form);
        
        if (permOpt.isPresent()) {
            FormPermission perm = permOpt.get();
            System.out.println("    Permission found: role=" + perm.getRole());
            
            // Check expiry
            if (perm.getExpiryDate() != null && perm.getExpiryDate().isBefore(LocalDateTime.now())) {
                System.out.println("    Permission EXPIRED");
                return false;
            }
            
            if (requiredRole == null) {
                 System.out.println("    Access granted (any role)");
                 return true;
            }
            
            if (perm.getRole() == FormRole.BUILDER) {
                 System.out.println("    Access granted (BUILDER role)");
                 return true; // BUILDER can do everything a VIEWER can
            }
            
            boolean match = perm.getRole() == requiredRole;
            System.out.println("    Role match check: " + (match ? "SUCCESS" : "FAIL"));
            return match;
        }
        
        System.out.println("    No explicit permission found in repository");
        return false;
    }
}
