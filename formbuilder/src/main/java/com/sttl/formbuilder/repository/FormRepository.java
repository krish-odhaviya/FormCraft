package com.sttl.formbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.sttl.formbuilder.entity.Form;

import java.util.List;
import java.util.Optional;

public interface FormRepository extends JpaRepository<Form, Long> {

    /** All forms belonging to one user. */
    List<Form> findByCreatedByUsername(String username);

    /** Check name uniqueness scoped to a single owner. */
    boolean existsByNameAndCreatedByUsername(String name, String username);

    /** Fetch a form only if it belongs to the given owner. */
    Optional<Form> findByIdAndCreatedByUsername(Long id, String username);
}