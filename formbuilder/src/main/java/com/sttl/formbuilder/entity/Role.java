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

    /** If true, this is a system-level role (SYSTEM_ADMIN) */
    @Column(nullable = false)
    private boolean isSystem = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
