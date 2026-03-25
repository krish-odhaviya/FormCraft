package com.sttl.formbuilder.entity;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.Enums.VisibilityType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "forms")
@Getter
@Setter
public class Form {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    /**
     * Human-readable, URL-safe, unique code for this form (e.g. "contact-us-v1").
     * Immutable after creation. Used in public-facing URLs.
     */
    @Column(unique = true, nullable = false, updatable = false, length = 100)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    private String description;

    /** The username of the admin who created this form (tenant key). */
    @Column(nullable = false, updatable = false)
    private String createdByUsername;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisibilityType visibility = VisibilityType.RESTRICTED;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormStatusEnum status = FormStatusEnum.DRAFT;

    @Column(unique = true)
    private String tableName;

    private LocalDateTime publishedAt;

    /** Versions of the field definitions for this form. */
    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNumber DESC")
    private List<FormVersion> versions = new ArrayList<>();

    @PrePersist
    public void generateCode() {
        if (this.code == null || this.code.isBlank()) {
            // Default: a short UUID-based code, can be overridden by caller
            this.code = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }
    }
}
