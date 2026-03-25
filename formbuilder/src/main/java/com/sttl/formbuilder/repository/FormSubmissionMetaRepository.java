package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FormSubmissionMeta;
import com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus;
import com.sttl.formbuilder.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FormSubmissionMetaRepository extends JpaRepository<FormSubmissionMeta, UUID> {

    @Query("SELECT COUNT(m) FROM FormSubmissionMeta m WHERE m.isDeleted = false " +
           "AND m.status = :status " +
           "AND (m.form.owner = :user OR EXISTS (SELECT 1 FROM FormPermission p WHERE p.form = m.form AND p.user = :user))")
    long countSubmissionsAccessibleToUser(@Param("user") User user, @Param("status") SubmissionStatus status);

    @Query("SELECT COUNT(m) FROM FormSubmissionMeta m WHERE m.isDeleted = false AND m.status = :status")
    long countAllNonDeletedSubmitted(@Param("status") SubmissionStatus status);

    /** Find a live (non-deleted) meta record by its data-row ID for a given form. */
    Optional<FormSubmissionMeta> findByFormIdAndDataRowIdAndIsDeletedFalse(UUID formId, UUID dataRowId);

    /** Soft-delete a single meta row. */
    @Modifying
    @Query("UPDATE FormSubmissionMeta m SET m.isDeleted = true WHERE m.form.id = :formId AND m.dataRowId = :dataRowId")
    void softDeleteByDataRowId(@Param("formId") UUID formId, @Param("dataRowId") UUID dataRowId);

    long countByFormIdAndIsDeletedFalseAndStatus(UUID formId, SubmissionStatus status);

    @Modifying
    @Query("DELETE FROM FormSubmissionMeta m WHERE m.form.id = :formId AND m.status = com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus.DRAFT")
    int deleteAllDraftsByFormId(@Param("formId") UUID formId);

    @Query("SELECT (count(m) > 0) FROM FormSubmissionMeta m WHERE m.form.id = :formId AND m.status = com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus.SUBMITTED AND m.isDeleted = false")
    boolean existsLiveSubmissions(@Param("formId") UUID formId);
}
