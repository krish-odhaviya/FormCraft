package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.ModuleRequestDTO;
import com.sttl.formbuilder.dto.ModuleResponseDTO;
import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.mapper.ModuleMapper;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.ModuleRepository;
import com.sttl.formbuilder.repository.RoleModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final RoleModuleRepository roleModuleRepository;
    private final ModuleMapper moduleMapper;

    public List<ModuleResponseDTO> getAllModules() {
        return moduleRepository.findAll().stream()
                .map(moduleMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ModuleResponseDTO createModule(ModuleRequestDTO dto) {
        if (moduleRepository.existsByModuleName(dto.getModuleName())) {
            throw new BusinessException("Module with this name already exists", HttpStatus.CONFLICT);
        }
        Module module = moduleMapper.toEntity(dto);
        handleRelationships(dto, module);
        return moduleMapper.toResponse(moduleRepository.save(module));
    }

    @Transactional
    public ModuleResponseDTO updateModule(UUID id, ModuleRequestDTO dto) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Module not found", HttpStatus.NOT_FOUND));
        
        // Update basic fields via mapper
        Module updated = moduleMapper.toEntity(dto);
        updated.setId(module.getId());
        handleRelationships(dto, updated);
        
        return moduleMapper.toResponse(moduleRepository.save(updated));
    }

    @Transactional
    public void deleteModule(UUID id) {
        if (!moduleRepository.existsById(id)) {
            throw new BusinessException("Module not found", HttpStatus.NOT_FOUND);
        }
        roleModuleRepository.deleteByModuleId(id);
        moduleRepository.deleteById(id);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private void handleRelationships(ModuleRequestDTO dto, Module module) {
        if (dto.getParentId() != null) {
            module.setParentModule(moduleRepository.findById(dto.getParentId()).orElse(null));
        }
        if (dto.getSubParentId() != null) {
            module.setSubParentModule(moduleRepository.findById(dto.getSubParentId()).orElse(null));
        }
    }
}
