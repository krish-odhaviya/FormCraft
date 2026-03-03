package com.sttl.formbuilder.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sttl.formbuilder.entity.FormField;

public interface FormFieldRepository extends JpaRepository<FormField, Long> {

    List<FormField> findByVersionIdOrderByFieldOrder(Long versionId);

    boolean existsByVersionIdAndFieldKey(Long versionId, String fieldKey);


    void deleteByVersion_Id(Long versionId);



    void deleteAllByVersion_Id(Long versionId);
}
