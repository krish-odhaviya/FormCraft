package com.sttl.formbuilder.service;

import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.entity.RoleModule;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.entity.UserRole;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.RoleModuleRepository;
import com.sttl.formbuilder.repository.UserRepository;
import com.sttl.formbuilder.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Enforces menu-level (module-level) access control.
 *
 * Every non-public feature maps to a module name stored in the database.
 * Services call assertHasModule() before executing any business logic.
 * If the user's role does not have that module assigned, a 403 is thrown —
 * regardless of whether the request came from browser, Postman, or curl.
 *
 * SYSTEM_ADMIN bypasses all module checks.
 */
@Service
@RequiredArgsConstructor
public class ModuleAccessService {

    private final UserRepository       userRepository;
    private final UserRoleRepository   userRoleRepository;
    private final RoleModuleRepository roleModuleRepository;

    // ── Module name constants — match exactly what DataInitializer seeds ──────

    public static final String MODULE_FORM_VAULT        = "Form Vault";
    public static final String MODULE_CREATE_FORM       = "Create New Form";
    public static final String MODULE_FORM_REQUEST      = "Form Request";
    public static final String MODULE_MY_REQUESTS       = "My Requests";
    public static final String MODULE_ALL_REQUESTS      = "All Access Requests";
    public static final String MODULE_MODULE_MANAGEMENT = "Module Management";
    public static final String MODULE_ROLE_MANAGEMENT   = "Role Management";
    public static final String MODULE_USER_MANAGEMENT   = "User Management";

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Throws 403 BusinessException if the user's role does not have the module.
     * SYSTEM_ADMIN always passes.
     *
     * Usage: moduleAccessService.assertHasModule(username, MODULE_CREATE_FORM);
     */
    public void assertHasModule(String username, String moduleName) {
        if (!hasModule(username, moduleName)) {
            throw new BusinessException(
                    "Access denied: your role does not include the '"
                            + moduleName + "' feature",
                    HttpStatus.FORBIDDEN
            );
        }
    }

    /**
     * Returns true if the user's role has the given module assigned.
     * SYSTEM_ADMIN always returns true.
     */
    public boolean hasModule(String username, String moduleName) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return false;

        List<UserRole> userRoles = userRoleRepository.findByUser(user);
        if (userRoles.isEmpty()) return false;

        // SYSTEM_ADMIN bypasses all module checks
        boolean isAdmin = userRoles.stream()
                .anyMatch(ur -> "SYSTEM_ADMIN".equalsIgnoreCase(ur.getRole().getRoleName()));
        if (isAdmin) return true;

        // Collect all active module names assigned to the user's role(s)
        Set<String> assignedModules = userRoles.stream()
                .flatMap(ur -> roleModuleRepository.findByRole(ur.getRole()).stream())
                .map(RoleModule::getModule)
                .filter(Module::isActive)
                .map(Module::getModuleName)
                .collect(Collectors.toSet());

        return assignedModules.contains(moduleName);
    }
}