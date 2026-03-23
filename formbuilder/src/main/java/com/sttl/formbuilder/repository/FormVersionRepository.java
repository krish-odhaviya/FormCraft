package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FormVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FormVersionRepository extends JpaRepository<FormVersion, Long> {

    List<FormVersion> findByFormIdOrderByVersionNumberDesc(Long formId);

    Optional<FormVersion> findByFormIdAndIsActive(Long formId, Boolean isActive);

    Optional<FormVersion> findFirstByFormIdOrderByVersionNumberDesc(Long formId);

    /** Deactivate ALL versions for a form (used before activating a new one). */
    @Modifying
    @Query("UPDATE FormVersion v SET v.isActive = false WHERE v.form.id = :formId")
    void deactivateAllVersions(@Param("formId") Long formId);

    /** Count existing versions so we can compute the next version number. */
    long countByFormId(Long formId);
}
