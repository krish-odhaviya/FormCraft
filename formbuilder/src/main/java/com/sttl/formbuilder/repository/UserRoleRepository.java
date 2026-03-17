package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    List<UserRole> findByUser(User user);
    Optional<UserRole> findFirstByUser(User user);
    boolean existsByUserAndRoleId(User user, Long roleId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserRole ur WHERE ur.user.id = :userId")
    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserRole ur WHERE ur.role.id = :roleId")
    void deleteByRoleId(Long roleId);
}
