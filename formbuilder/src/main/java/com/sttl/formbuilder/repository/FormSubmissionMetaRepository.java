package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FormSubmissionMeta;
import com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import java.util.UUID;

@Repository
public interface FormSubmissionMetaRepository extends JpaRepository<FormSubmissionMeta, UUID> {

    /** Find a live (non-deleted) meta record by its data-row ID for a given form. */
    Optional<FormSubmissionMeta> findByFormIdAndDataRowIdAndIsDeletedFalse(UUID formId, UUID dataRowId);

    /** Soft-delete a single meta row. */
    @Modifying
    @Query("UPDATE FormSubmissionMeta m SET m.isDeleted = true WHERE m.form.id = :formId AND m.dataRowId = :dataRowId")
    void softDeleteByDataRowId(@Param("formId") UUID formId, @Param("dataRowId") UUID dataRowId);

    /** Count non-deleted submissions for a form. */
    long countByFormIdAndIsDeletedFalseAndStatus(UUID formId, SubmissionStatus status);
}
