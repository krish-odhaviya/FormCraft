package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FormPermission;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import java.util.UUID;

@Repository
public interface FormPermissionRepository extends JpaRepository<FormPermission, UUID> {
    List<FormPermission> findByForm(Form form);
    List<FormPermission> findByUser(User user);
    Optional<FormPermission> findByUserAndForm(User user, Form form);
}
