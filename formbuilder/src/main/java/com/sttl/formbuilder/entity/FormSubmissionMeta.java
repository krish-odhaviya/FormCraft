package com.sttl.formbuilder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Central metadata record for every form submission (draft or final).
 * <p>
 * The actual field values are stored in the per-form dynamic table
 * ({@code form_<formId>_data}). This table tracks lifecycle state,
 * links the row to a specific form version, and records the submitter.
 * </p>
 */
@Entity
@Table(
    name = "form_submission_meta",
    indexes = {
        @Index(name = "idx_fsm_form_id",       columnList = "form_id"),
        @Index(name = "idx_fsm_version_id",    columnList = "form_version_id"),
        @Index(name = "idx_fsm_submitter",     columnList = "submitted_by"),
        @Index(name = "idx_fsm_status",        columnList = "status")
    }
)
@Getter
@Setter
public class FormSubmissionMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private java.util.UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "form_id", nullable = false)
    private Form form;

    /** The version of the form definition used for this submission. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_version_id")
    private FormVersion formVersion;

    /**
     * Submission lifecycle: DRAFT → SUBMITTED.
     * Soft-deleted rows are flagged via {@code isDeleted}.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    /** Row ID in the per-form dynamic data table. */
    @Column(name = "data_row_id", columnDefinition = "uuid")
    private java.util.UUID dataRowId;

    /** Null for anonymous submissions. */
    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime submittedAt;

    @Column(nullable = false)
    private Boolean isDeleted = false;

    public enum SubmissionStatus {
        DRAFT, SUBMITTED
    }
}
