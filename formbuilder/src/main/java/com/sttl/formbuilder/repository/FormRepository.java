package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import com.sttl.formbuilder.entity.Form;

import java.util.List;
import java.util.Optional;

public interface FormRepository extends JpaRepository<Form, Long> {

    /** All forms belonging to one user. */
    List<Form> findByCreatedByUsername(String username);

    List<Form> findByOwner(User owner);

    List<Form> findByVisibility(com.sttl.formbuilder.Enums.VisibilityType visibility);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT f FROM Form f WHERE f.owner = :user OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.LINK OR EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = f AND p.user = :user)")
    List<Form> findFormsAccessibleToUser(@org.springframework.data.repository.query.Param("user") User user);

    boolean existsByNameAndOwner(String name, User owner);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM Form f LEFT JOIN FETCH f.fields WHERE f.id = :id")
    Optional<Form> findByIdWithFields(@org.springframework.data.repository.query.Param("id") Long id);

    List<Form> findAllByStatus(FormStatusEnum formStatusEnum);
}