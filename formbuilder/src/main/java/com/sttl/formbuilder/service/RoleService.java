package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.RoleRequestDTO;
import com.sttl.formbuilder.dto.RoleResponseDTO;
import com.sttl.formbuilder.entity.*;
import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final RoleModuleRepository roleModuleRepository;
    private final UserRoleRepository userRoleRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;

    public List<RoleResponseDTO> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public RoleResponseDTO getRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND));
        return toDTO(role);
    }

    @Transactional
    public RoleResponseDTO createRole(RoleRequestDTO dto) {
        if (roleRepository.existsByRoleName(dto.getRoleName())) {
            throw new BusinessException("Role with this name already exists", HttpStatus.CONFLICT);
        }
        Role role = new Role();
        role.setRoleName(dto.getRoleName());
        role.setDescription(dto.getDescription());
        role.setCanCreateForm(dto.isCanCreateForm());
        role.setCanEditForm(dto.isCanEditForm());
        role.setCanDeleteForm(dto.isCanDeleteForm());
        role.setCanArchiveForm(dto.isCanArchiveForm());
        role.setCanViewSubmissions(dto.isCanViewSubmissions());
        role.setCanDeleteSubmissions(dto.isCanDeleteSubmissions());
        Role saved = roleRepository.save(role);

        if (dto.getModuleIds() != null && !dto.getModuleIds().isEmpty()) {
            assignModules(saved, dto.getModuleIds());
        }
        return toDTO(saved);
    }

    @Transactional
    public RoleResponseDTO updateRole(Long id, RoleRequestDTO dto) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND));
        role.setRoleName(dto.getRoleName());
        role.setDescription(dto.getDescription());
        role.setCanCreateForm(dto.isCanCreateForm());
        role.setCanEditForm(dto.isCanEditForm());
        role.setCanDeleteForm(dto.isCanDeleteForm());
        role.setCanArchiveForm(dto.isCanArchiveForm());
        role.setCanViewSubmissions(dto.isCanViewSubmissions());
        role.setCanDeleteSubmissions(dto.isCanDeleteSubmissions());
        roleRepository.save(role);

        if (dto.getModuleIds() != null) {
            roleModuleRepository.deleteByRoleId(id);
            assignModules(role, dto.getModuleIds());
        }
        return toDTO(role);
    }

    @Transactional
    public void deleteRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND));
        if (role.isDefault()) {
            throw new BusinessException("Cannot delete a default role", HttpStatus.CONFLICT);
        }
        roleModuleRepository.deleteByRoleId(id);
        userRoleRepository.deleteByRoleId(id);
        roleRepository.deleteById(id);
    }

    @Transactional
    public void assignModulesToRole(Long roleId, List<Long> moduleIds) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND));
        roleModuleRepository.deleteByRoleId(roleId);
        assignModules(role, moduleIds);
    }

    /** Replace the user's current custom role with the new one */
    @Transactional
    public void assignRoleToUser(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND));

        userRoleRepository.deleteByUserId(userId);

        UserRole ur = new UserRole();
        ur.setUser(user);
        ur.setRole(role);
        userRoleRepository.save(ur);
    }

    public String getUserRoleName(User user) {
        return userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().getRoleName())
                .orElse(null);
    }

    public Long getCustomRoleId(User user) {
        return userRoleRepository.findFirstByUser(user)
                .map(ur -> ur.getRole().getId())
                .orElse(null);
    }

    public List<Long> getModuleIdsByRole(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND));
        return roleModuleRepository.findByRole(role).stream()
                .map(rm -> rm.getModule().getId())
                .collect(Collectors.toList());
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private void assignModules(Role role, List<Long> moduleIds) {
        for (Long moduleId : moduleIds) {
            Module module = moduleRepository.findById(moduleId)
                    .orElseThrow(() -> new BusinessException("Module not found: " + moduleId, HttpStatus.NOT_FOUND));
            if (!roleModuleRepository.existsByRoleAndModule(role, module)) {
                RoleModule rm = new RoleModule();
                rm.setRole(role);
                rm.setModule(module);
                roleModuleRepository.save(rm);
            }
        }
    }

    public RoleResponseDTO toDTO(Role role) {
        RoleResponseDTO dto = new RoleResponseDTO();
        dto.setId(role.getId());
        dto.setRoleName(role.getRoleName());
        dto.setDescription(role.getDescription());
        dto.setDefault(role.isDefault());
        dto.setSystem(role.isSystem());
        dto.setCreatedAt(role.getCreatedAt());
        dto.setCanCreateForm(role.isCanCreateForm());
        dto.setCanEditForm(role.isCanEditForm());
        dto.setCanDeleteForm(role.isCanDeleteForm());
        dto.setCanArchiveForm(role.isCanArchiveForm());
        dto.setCanViewSubmissions(role.isCanViewSubmissions());
        dto.setCanDeleteSubmissions(role.isCanDeleteSubmissions());
        dto.setModuleIds(roleModuleRepository.findByRole(role).stream()
                .map(rm -> rm.getModule().getId())
                .collect(Collectors.toList()));
        dto.setAssignedUserCount((int) userRoleRepository.findAll().stream()
                .filter(ur -> ur.getRole().getId().equals(role.getId()))
                .count());
        return dto;
    }
}
