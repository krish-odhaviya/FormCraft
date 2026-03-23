package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FormSubmissionMeta;
import com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FormSubmissionMetaRepository extends JpaRepository<FormSubmissionMeta, Long> {

    /** Find a live (non-deleted) meta record by its data-row ID for a given form. */
    Optional<FormSubmissionMeta> findByFormIdAndDataRowIdAndIsDeletedFalse(Long formId, Long dataRowId);

    /** Soft-delete a single meta row. */
    @Modifying
    @Query("UPDATE FormSubmissionMeta m SET m.isDeleted = true WHERE m.form.id = :formId AND m.dataRowId = :dataRowId")
    void softDeleteByDataRowId(@Param("formId") Long formId, @Param("dataRowId") Long dataRowId);

    /** Count non-deleted submissions for a form. */
    long countByFormIdAndIsDeletedFalseAndStatus(Long formId, SubmissionStatus status);
}
