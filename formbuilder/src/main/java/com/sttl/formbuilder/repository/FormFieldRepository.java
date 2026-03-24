package com.sttl.formbuilder.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sttl.formbuilder.entity.FormField;

import java.util.UUID;

public interface FormFieldRepository extends JpaRepository<FormField, UUID> {

    List<FormField> findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(UUID formVersionId);

    boolean existsByFormVersionIdAndFieldKeyAndIsDeletedFalse(UUID formVersionId, String fieldKey);

    void deleteByFormVersion_Id(UUID formVersionId);

    void deleteAllByFormVersion_Id(UUID formVersionId);
}
