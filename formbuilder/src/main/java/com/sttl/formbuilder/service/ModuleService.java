package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.ModuleRequestDTO;
import com.sttl.formbuilder.dto.ModuleResponseDTO;
import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository moduleRepository;

    public List<ModuleResponseDTO> getAllModules() {
        return moduleRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ModuleResponseDTO createModule(ModuleRequestDTO dto) {
        if (moduleRepository.existsByModuleName(dto.getModuleName())) {
            throw new BusinessException("Module with this name already exists", HttpStatus.CONFLICT);
        }
        Module module = new Module();
        mapToEntity(dto, module);
        return toDTO(moduleRepository.save(module));
    }

    @Transactional
    public ModuleResponseDTO updateModule(Long id, ModuleRequestDTO dto) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Module not found", HttpStatus.NOT_FOUND));
        mapToEntity(dto, module);
        return toDTO(moduleRepository.save(module));
    }

    @Transactional
    public void deleteModule(Long id) {
        if (!moduleRepository.existsById(id)) {
            throw new BusinessException("Module not found", HttpStatus.NOT_FOUND);
        }
        moduleRepository.deleteById(id);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private void mapToEntity(ModuleRequestDTO dto, Module module) {
        module.setModuleName(dto.getModuleName());
        module.setDescription(dto.getDescription());
        module.setPrefix(dto.getPrefix());
        module.setIconCss(dto.getIconCss());
        module.setParentFlag(dto.isParent());
        module.setSubParentFlag(dto.isSubParent());
        module.setParentModule(dto.getParentId() != null
                ? moduleRepository.findById(dto.getParentId()).orElse(null) : null);
        module.setSubParentModule(dto.getSubParentId() != null
                ? moduleRepository.findById(dto.getSubParentId()).orElse(null) : null);
        module.setActive(dto.isActive());
        module.setSortOrder(dto.getSortOrder());
    }

    public ModuleResponseDTO toDTO(Module m) {
        ModuleResponseDTO dto = new ModuleResponseDTO();
        dto.setId(m.getId());
        dto.setModuleName(m.getModuleName());
        dto.setDescription(m.getDescription());
        dto.setPrefix(m.getPrefix());
        dto.setIconCss(m.getIconCss());
        dto.setParent(m.isParentFlag());
        dto.setSubParent(m.isSubParentFlag());
        dto.setParentId(m.getParentModule() != null ? m.getParentModule().getId() : null);
        dto.setParentName(m.getParentModule() != null ? m.getParentModule().getModuleName() : null);
        dto.setSubParentId(m.getSubParentModule() != null ? m.getSubParentModule().getId() : null);
        dto.setActive(m.isActive());
        dto.setSortOrder(m.getSortOrder());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }
}
