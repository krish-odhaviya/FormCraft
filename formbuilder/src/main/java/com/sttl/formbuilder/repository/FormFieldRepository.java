package com.sttl.formbuilder.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sttl.formbuilder.entity.FormField;

import java.util.UUID;

public interface FormFieldRepository extends JpaRepository<FormField, UUID> {

    List<FormField> findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(UUID formVersionId);

    @Query("SELECT f FROM FormField f WHERE f.formVersion.form.id = :formId AND f.isDeleted = false ORDER BY f.fieldOrder")
    List<FormField> findByFormIdAndIsDeletedFalseOrderByFieldOrder(@Param("formId") UUID formId);

    boolean existsByFormVersionIdAndFieldKeyAndIsDeletedFalse(UUID formVersionId, String fieldKey);

    void deleteByFormVersion_Id(UUID formVersionId);

    void deleteAllByFormVersion_Id(UUID formVersionId);
}
