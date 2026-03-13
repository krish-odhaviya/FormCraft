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

    /**
     * Returns the hierarchical menu tree for the given username.
     * Falls back to FORMS_MANAGER modules if user has no assigned role.
     */
    public List<MenuItemDTO> getMenuForUser(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return Collections.emptyList();

        Optional<UserRole> userRoleOpt = userRoleRepository.findFirstByUser(user);
        Role role = userRoleOpt.map(UserRole::getRole)
                .orElseGet(() -> roleRepository.findByRoleName("FORMS_MANAGER").orElse(null));

        if (role == null) return Collections.emptyList();

        List<Module> modules = roleModuleRepository.findByRole(role).stream()
                .map(RoleModule::getModule)
                .filter(Module::isActive)
                .sorted(Comparator.comparingInt(Module::getSortOrder))
                .collect(Collectors.toList());

        return buildTree(modules);
    }

    private List<MenuItemDTO> buildTree(List<Module> modules) {
        Map<Long, MenuItemDTO> dtoMap = new LinkedHashMap<>();
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
