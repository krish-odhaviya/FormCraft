package com.sttl.formbuilder.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sttl.formbuilder.entity.FormField;

public interface FormFieldRepository extends JpaRepository<FormField, Long> {

    List<FormField> findByFormIdAndIsDeletedFalseOrderByFieldOrder(Long formId);

    boolean existsByFormIdAndFieldKeyAndIsDeletedFalse(Long formId, String fieldKey);

    void deleteByForm_Id(Long formId);

    void deleteAllByForm_Id(Long formId);
}
