package com.sttl.formbuilder.repository;

import com.sttl.formbuilder.entity.AccessRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessRequestRepository extends JpaRepository<AccessRequest, Long> {
    List<AccessRequest> findByStatus(String status);
    List<AccessRequest> findByUser(User user);
    List<AccessRequest> findByFormAndStatus(Form form, String status);
    List<AccessRequest> findByFormOwnerAndStatus(User owner, String status);
    boolean existsByUserAndFormAndStatusIn(User user, Form form, List<String> statuses);
}
