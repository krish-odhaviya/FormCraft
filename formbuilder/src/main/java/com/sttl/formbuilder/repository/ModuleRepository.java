package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {
    List<Module> findByActiveTrue();
    List<Module> findByParentModuleIsNullOrderBySortOrderAsc();
    List<Module> findByParentModuleIdOrderBySortOrderAsc(Long parentModuleId);
    boolean existsByModuleName(String moduleName);
}
