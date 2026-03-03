package com.sttl.formbuilder.repository;
import org.springframework.data.jpa.repository.JpaRepository;

import com.sttl.formbuilder.entity.Form;
public interface FormRepository extends JpaRepository<Form, Long> {
    boolean existsByName(String name);
}