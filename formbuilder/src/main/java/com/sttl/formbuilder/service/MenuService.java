package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.MenuItemDTO;
import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.entity.Role;
import com.sttl.formbuilder.entity.RoleModule;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.entity.UserRole;
import com.sttl.formbuilder.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleModuleRepository roleModuleRepository;
    private final RoleRepository roleRepository;
    private final ModuleRepository moduleRepository;

    private static final Set<String> RESTRICTED_MODULES = Set.of(
            "System Admin", "Module Management", "Role Management", "User Management", "All Access Requests"
    );

    private static final Set<String> AUTO_GRANT_MODULES = Set.of(
            "System Admin", "Module Management", "Role Management", "User Management", "All Access Requests", "Form Request"
    );

    /**
     * Returns the hierarchical menu tree for the given username.
     * Falls back to FORMS_MANAGER modules if user has no assigned role.
     */
    public List<MenuItemDTO> getMenuForUser(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return Collections.emptyList();

        List<UserRole> userRoles = userRoleRepository.findByUser(user);
        if (userRoles.isEmpty()) {
            Role fallback = roleRepository.findByRoleName("FORMS_MANAGER").orElse(null);
            if (fallback == null) return Collections.emptyList();
            
            List<Module> modules = roleModuleRepository.findByRole(fallback).stream()
                    .map(RoleModule::getModule)
                    .filter(m -> m.isActive() && !RESTRICTED_MODULES.contains(m.getModuleName()))
                    .sorted(Comparator.comparingInt(Module::getSortOrder))
                    .collect(Collectors.toList());
            return buildTree(modules);
        }

        boolean isAnySystemAdmin = userRoles.stream().anyMatch(ur -> 
            "SYSTEM_ADMIN".equalsIgnoreCase(ur.getRole().getRoleName())
        );

        Set<Module> uniqueModules = new HashSet<>();
        for (UserRole ur : userRoles) {
            Role r = ur.getRole();
            roleModuleRepository.findByRole(r).stream()
                    .map(RoleModule::getModule)
                    .filter(Module::isActive)
                    .forEach(uniqueModules::add);
        }

        if (isAnySystemAdmin) {
            // Auto-grant all management modules to SYSTEM_ADMIN
            moduleRepository.findAll().stream()
                    .filter(m -> AUTO_GRANT_MODULES.contains(m.getModuleName()))
                    .forEach(uniqueModules::add);
        }

        // Filter out restricted modules for non-admins (extra safety)
        if (!isAnySystemAdmin) {
            uniqueModules.removeIf(m -> RESTRICTED_MODULES.contains(m.getModuleName()));
        }

        List<Module> filteredModules = uniqueModules.stream()
                .filter(Module::isActive) // Ensure modules are active after all additions/removals
                .sorted(Comparator.comparingInt(Module::getSortOrder))
                .collect(Collectors.toList());

        return buildTree(filteredModules);
    }

    private List<MenuItemDTO> buildTree(List<Module> modules) {
        Map<java.util.UUID, MenuItemDTO> dtoMap = new LinkedHashMap<>();
        for (Module m : modules) {
            MenuItemDTO dto = new MenuItemDTO();
            dto.setId(m.getId());
            dto.setModuleName(m.getModuleName());
            dto.setPrefix(m.getPrefix());
            dto.setIconCss(m.getIconCss());
            dto.setParent(m.isParentFlag());
            dto.setSubParent(m.isSubParentFlag());
            dto.setSortOrder(m.getSortOrder());
            dtoMap.put(m.getId(), dto);
        }

        List<MenuItemDTO> roots = new ArrayList<>();
        for (Module m : modules) {
            MenuItemDTO dto = dtoMap.get(m.getId());
            if (m.getParentModule() == null) {
                roots.add(dto);
            } else {
                MenuItemDTO parentDto = dtoMap.get(m.getParentModule().getId());
                if (parentDto != null) {
                    parentDto.getChildren().add(dto);
                } else {
                    roots.add(dto);
                }
            }
        }

        return roots;
    }
}
