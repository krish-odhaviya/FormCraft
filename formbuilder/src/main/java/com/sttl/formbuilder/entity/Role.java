package com.sttl.formbuilder.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String roleName;

    @Column(length = 500)
    private String description;

    /** If true, this role is seeded automatically and cannot be deleted */
    @Column(nullable = false)
    private boolean isDefault = false;


    @Column(nullable = false)
    private boolean canCreateForm = false;

    @Column(nullable = false)
    private boolean canEditForm = false;

    @Column(nullable = false)
    private boolean canDeleteForm = false;

    @Column(nullable = false)
    private boolean canArchiveForm = false;

    @Column(nullable = false)
    private boolean canViewSubmissions = false;

    @Column(nullable = false)
    private boolean canDeleteSubmissions = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
