package com.sttl.formbuilder.repository;
import java.util.List;
import java.util.Optional;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;

import com.sttl.formbuilder.entity.FormVersion;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FormVersionRepository extends JpaRepository<FormVersion, Long> {

    Optional<FormVersion> findByFormIdAndStatus(Long formId, FormStatusEnum status);

    int countByFormId(Long formId);

	Optional<FormVersion> findById(Long versionId);

	List<FormVersion> findByFormIdOrderByVersionNumberAsc(Long formId);

    void deleteById(Long versionId);


    @Query("SELECT v FROM FormVersion v LEFT JOIN FETCH v.fields WHERE v.id = :id")
    Optional<FormVersion> findByIdWithFields(@Param("id") Long id);

    List<FormVersion> findAllByStatus(FormStatusEnum formStatusEnum);
}
