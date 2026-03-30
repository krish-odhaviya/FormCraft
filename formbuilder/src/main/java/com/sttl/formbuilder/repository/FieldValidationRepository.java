package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.FieldValidation;
import com.sttl.formbuilder.entity.FormVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FieldValidationRepository extends JpaRepository<FieldValidation, UUID> {
    List<FieldValidation> findByFormVersionOrderByExecutionOrderAsc(FormVersion formVersion);
    void deleteByFormVersion(FormVersion formVersion);
}
