package com.sttl.formbuilder.config;

import com.sttl.formbuilder.Enums.SystemRole;
import com.sttl.formbuilder.entity.*;
import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModuleRepository moduleRepository;
    private final RoleRepository roleRepository;
    private final RoleModuleRepository roleModuleRepository;
    private final UserRoleRepository userRoleRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminUser();
        seedModules();
        seedRoles();
        assignRolesToExistingUsers();
    }

    private void seedAdminUser() {
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(SystemRole.ADMIN);
            admin.setEnabled(true);
            userRepository.save(admin);
            System.out.println("[Seed] Created admin user: admin / admin123");
        }
    }

    private void seedModules() {
        // === Forms Management (parent) ===
        Module formsParent = findOrCreateModule("Forms Management", null, "/", "file-text", true, false, null, null, 1);
        findOrCreateModule("Form Vault", "All your forms", "/", "inbox", false, false, formsParent, null, 2);
        findOrCreateModule("Create New Form", "Start a new form", "/forms/new", "plus-circle", false, false, formsParent, null, 3);

        // === System Admin (parent) ===
        Module sysParent = findOrCreateModule("System Admin", null, null, "shield", true, false, null, null, 10);
        findOrCreateModule("Module Management", "Manage site modules", "/admin/modules", "layout-list", false, false, sysParent, null, 11);
        findOrCreateModule("Role Management", "Manage roles", "/admin/roles", "users-cog", false, false, sysParent, null, 12);
        findOrCreateModule("User Management", "Manage users", "/admin/users", "user-cog", false, false, sysParent, null, 13);
    }

    private void seedRoles() {
        // Collect all modules
        List<Module> allModules = moduleRepository.findAll();
        List<Module> formsModules = allModules.stream()
                .filter(m -> m.getModuleName().contains("Form") || m.getModuleName().contains("Create"))
                .toList();

        // SYSTEM_ADMIN — gets all modules and all permissions
        Role sysAdmin = findOrCreateRole("SYSTEM_ADMIN", "Full system access", true, true, 
                                         true, true, true, true, true, true);
        if (roleModuleRepository.findByRole(sysAdmin).isEmpty()) {
            for (Module m : allModules) {
                assignModuleToRole(sysAdmin, m);
            }
        }

        // FORMS_MANAGER — gets forms modules only, basic permissions
        Role formsManager = findOrCreateRole("FORMS_MANAGER", "Access to form management", true, false,
                                             true, true, false, false, true, false);
        if (roleModuleRepository.findByRole(formsManager).isEmpty()) {
            for (Module m : formsModules) {
                assignModuleToRole(formsManager, m);
            }
        }
    }

    private void assignRolesToExistingUsers() {
        Optional<Role> sysAdminRole = roleRepository.findByRoleName("SYSTEM_ADMIN");
        Optional<Role> formsManagerRole = roleRepository.findByRoleName("FORMS_MANAGER");

        for (User user : userRepository.findAll()) {
            if (userRoleRepository.findFirstByUser(user).isPresent()) continue; // already has role

            Role toAssign;
            if (user.getRole() == SystemRole.ADMIN && sysAdminRole.isPresent()) {
                toAssign = sysAdminRole.get();
            } else if (formsManagerRole.isPresent()) {
                toAssign = formsManagerRole.get();
            } else {
                continue;
            }

            UserRole ur = new UserRole();
            ur.setUser(user);
            ur.setRole(toAssign);
            userRoleRepository.save(ur);
            System.out.println("[Seed] Assigned role " + toAssign.getRoleName() + " to user " + user.getUsername());
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private Module findOrCreateModule(String name, String description, String prefix,
                                      String iconCss, boolean parentFlag, boolean subParentFlag,
                                      Module parentModule, Module subParentModule, int sortOrder) {
        return moduleRepository.findAll().stream()
                .filter(m -> m.getModuleName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    Module m = new Module();
                    m.setModuleName(name);
                    m.setDescription(description);
                    m.setPrefix(prefix);
                    m.setIconCss(iconCss);
                    m.setParentFlag(parentFlag);
                    m.setSubParentFlag(subParentFlag);
                    m.setParentModule(parentModule);
                    m.setSubParentModule(subParentModule);
                    m.setSortOrder(sortOrder);
                    m.setActive(true);
                    Module saved = moduleRepository.save(m);
                    System.out.println("[Seed] Created module: " + name);
                    return saved;
                });
    }

    private Role findOrCreateRole(String name, String description, boolean isDefault, boolean isSystem,
                                  boolean create, boolean edit, boolean delete, boolean archive, 
                                  boolean viewSub, boolean delSub) {
        return roleRepository.findByRoleName(name).orElseGet(() -> {
            Role role = new Role();
            role.setRoleName(name);
            role.setDescription(description);
            role.setDefault(isDefault);
            role.setSystem(isSystem);
            role.setCanCreateForm(create);
            role.setCanEditForm(edit);
            role.setCanDeleteForm(delete);
            role.setCanArchiveForm(archive);
            role.setCanViewSubmissions(viewSub);
            role.setCanDeleteSubmissions(delSub);
            Role saved = roleRepository.save(role);
            System.out.println("[Seed] Created role: " + name);
            return saved;
        });
    }

    private void assignModuleToRole(Role role, Module module) {
        if (!roleModuleRepository.existsByRoleAndModule(role, module)) {
            RoleModule rm = new RoleModule();
            rm.setRole(role);
            rm.setModule(module);
            roleModuleRepository.save(rm);
        }
    }
}
