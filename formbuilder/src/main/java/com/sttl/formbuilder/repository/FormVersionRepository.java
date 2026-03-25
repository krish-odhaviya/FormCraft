package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FormVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import java.util.UUID;

@Repository
public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {

    List<FormVersion> findByFormIdOrderByVersionNumberDesc(UUID formId);

    Optional<FormVersion> findByFormIdAndIsActive(UUID formId, Boolean isActive);

    Optional<FormVersion> findByFormIdAndIsActiveAndIsDraftWorkingCopy(UUID formId, Boolean isActive, Boolean isDraftWorkingCopy);

    Optional<FormVersion> findFirstByFormIdOrderByVersionNumberDesc(UUID formId);

    /** Deactivate ALL versions for a form (used before activating a new one). */
    @Modifying
    @Query("UPDATE FormVersion v SET v.isActive = false, v.isDraftWorkingCopy = false WHERE v.form.id = :formId")
    void deactivateAllVersions(@Param("formId") UUID formId);

    /** Count existing versions so we can compute the next version number. */
    long countByFormId(UUID formId);

    @Query("SELECT MAX(v.versionNumber) FROM FormVersion v WHERE v.form.id = :formId")
    Integer findMaxVersionNumberByFormId(@Param("formId") UUID formId);
}
