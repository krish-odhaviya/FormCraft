package com.sttl.formbuilder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Immutable snapshot of a form's field definitions at the time of publishing.
 * <p>
 * Once a version is ACTIVE it must not be edited. Any changes to the form
 * require creating a new version and activating it (which deactivates all others
 * for the same form).
 * </p>
 */
@Entity
@Table(
    name = "form_versions",
    indexes = {
        @Index(name = "idx_fv_form_id",  columnList = "form_id"),
        @Index(name = "idx_fv_active",   columnList = "form_id, is_active")
    }
)
@Getter
@Setter
public class FormVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private java.util.UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "form_id", nullable = false)
    private Form form;

    /** Sequential version number within a form (1, 2, 3, …). */
    @Column(nullable = false)
    private Integer versionNumber;

    /**
     * Full JSON snapshot of the field definitions at publish time.
     * Schema: array of FormField-like objects (fieldKey, fieldType, required, conditions, …).
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String definitionJson;

    /**
     * Only one version per form may be ACTIVE at any time.
     * Enforced transactionally in FormVersionService.
     */
    @Column(nullable = false)
    private Boolean isActive = false;

    @Column(nullable = false)
    private Boolean isDraftWorkingCopy = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Timestamp when this version was activated (first set to isActive=true). */
    private LocalDateTime activatedAt;

    /** Username of the user who created/activated this version. */
    @Column(length = 100)
    private String createdBy;
}
