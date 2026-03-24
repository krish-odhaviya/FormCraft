package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.UUID;

@Repository
public interface ModuleRepository extends JpaRepository<Module, UUID> {
    List<Module> findByActiveTrue();
    List<Module> findByParentModuleIsNullOrderBySortOrderAsc();
    List<Module> findByParentModuleIdOrderBySortOrderAsc(UUID parentModuleId);
    boolean existsByModuleName(String moduleName);
}
