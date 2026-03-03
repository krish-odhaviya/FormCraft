package com.sttl.formbuilder.entity;

import com.sttl.formbuilder.util.StringListConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "form_fields",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"version_id", "field_key"}
        )
)
@Getter
@Setter
public class FormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id", nullable = false)
    private FormVersion version;

    @Column(name = "field_key", nullable = false, length = 100)
    private String fieldKey;

    @Column(nullable = false, length = 150)
    private String fieldLabel;

    @Column(nullable = false)
    private String fieldType;

    @Column(nullable = false)
    private Boolean required = false;

    @Column(nullable = false)
    private Integer fieldOrder;

    // --- OPTIONS (The Relational Way) ---
    @ElementCollection(fetch = FetchType.EAGER) // Change to EAGER
    @CollectionTable(
            name = "form_field_options",
            joinColumns = @JoinColumn(name = "field_id")
    )
    @Column(name = "option_value")
    private List<String> options = new ArrayList<>();

    // --- UI CONFIG ---
    private String placeholder;
    private String helpText;
    private String defaultValue;
    private Boolean readOnly;

    // --- VALIDATION ---
    private Integer minLength;
    private Integer maxLength;
    private Double minValue;
    private Double maxValue;
    private String pattern;
    private String validationMessage;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}