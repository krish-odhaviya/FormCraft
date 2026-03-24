package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.Module;
import com.sttl.formbuilder.entity.Role;
import com.sttl.formbuilder.entity.RoleModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import java.util.UUID;

@Repository
public interface RoleModuleRepository extends JpaRepository<RoleModule, UUID> {
    List<RoleModule> findByRole(Role role);
    boolean existsByRoleAndModule(Role role, Module module);

    @Modifying
    @Transactional
    @Query("DELETE FROM RoleModule rm WHERE rm.role.id = :roleId")
    void deleteByRoleId(UUID roleId);

    @Modifying
    @Transactional
    @Query("DELETE FROM RoleModule rm WHERE rm.module.id = :moduleId")
    void deleteByModuleId(UUID moduleId);
}
