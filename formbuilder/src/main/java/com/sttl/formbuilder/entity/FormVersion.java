package com.sttl.formbuilder.entity;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "form_versions",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"form_id", "version_number"}
        )
)
@Getter
@Setter
public class FormVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "form_id", nullable = false)
    private Form form;

    @Column(nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormStatusEnum status;

    @Column(unique = true)
    private String tableName;

    @OneToMany(
            mappedBy = "version",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("fieldOrder ASC")
    private List<FormField> fields = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime publishedAt;

    // Helper method (VERY IMPORTANT)
    public void addField(FormField field) {
        fields.add(field);
        field.setVersion(this);
    }

    public void removeField(FormField field) {
        fields.remove(field);
        field.setVersion(null);
    }
}