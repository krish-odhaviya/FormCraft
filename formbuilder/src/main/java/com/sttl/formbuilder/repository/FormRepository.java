package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.Enums.VisibilityType;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FormRepository extends JpaRepository<Form, UUID> {

    /** All forms belonging to one user. */
    List<Form> findByCreatedByUsername(String username);

    List<Form> findByOwner(User owner);

    List<Form> findByVisibility(VisibilityType visibility);

    @Query("SELECT DISTINCT f FROM Form f WHERE " +
           "(f.owner = :user OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.PUBLIC OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.LINK OR EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = f AND p.user = :user)) " +
           "AND (:status IS NULL OR f.status = :status) " +
           "AND (:ownedOnly = false OR f.owner = :user) " +
           "AND (:sharedOnly = false OR (f.owner != :user AND EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = f AND p.user = :user)))")
    Page<Form> findFormsAccessibleToUser(
            @Param("user") User user, 
            @Param("status") FormStatusEnum status,
            @Param("ownedOnly") boolean ownedOnly,
            @Param("sharedOnly") boolean sharedOnly,
            Pageable pageable);

    @Query("SELECT DISTINCT f FROM Form f WHERE (f.owner = :user OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.PUBLIC OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.LINK OR EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = f AND p.user = :user))")
    Page<Form> findFormsAccessibleToUser(@Param("user") User user, Pageable pageable);

    @Query("SELECT DISTINCT f FROM Form f WHERE f.owner = :user OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.PUBLIC OR f.visibility = com.sttl.formbuilder.Enums.VisibilityType.LINK OR EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = f AND p.user = :user)")
    List<Form> findFormsAccessibleToUser(@Param("user") User user);

    boolean existsByNameAndOwner(String name, User owner);

    List<Form> findAllByStatus(FormStatusEnum formStatusEnum);

    /** Find by immutable form code. */
    Optional<Form> findByCode(String code);

    long countByOwner(User owner);
    long countByOwnerAndStatus(User owner, FormStatusEnum status);
    long countByStatus(FormStatusEnum status);

    @Query("SELECT f FROM Form f WHERE " +
           "(f.owner = :user OR f.visibility = :publicType OR f.visibility = :linkType OR EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = f AND p.user = :user)) " +
           "ORDER BY f.updatedAt DESC")
    List<Form> findTop5RecentAccessibleToUser(
            @Param("user") User user, 
            @Param("publicType") VisibilityType publicType,
            @Param("linkType") VisibilityType linkType,
            Pageable pageable);
}