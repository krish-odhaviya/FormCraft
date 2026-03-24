package com.sttl.formbuilder.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sttl.formbuilder.entity.FormField;

import java.util.UUID;

public interface FormFieldRepository extends JpaRepository<FormField, UUID> {

    List<FormField> findByFormIdAndIsDeletedFalseOrderByFieldOrder(UUID formId);

    boolean existsByFormIdAndFieldKeyAndIsDeletedFalse(UUID formId, String fieldKey);

    void deleteByForm_Id(UUID formId);

    void deleteAllByForm_Id(UUID formId);
}
