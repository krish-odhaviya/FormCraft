package com.sttl.formbuilder.entity;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "forms")
@Getter
@Setter
public class Form {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    private String description;

    /** The username of the admin who created this form (tenant key). */
    @Column(nullable = false, updatable = false)
    private String createdByUsername;

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

    @OneToMany(
            mappedBy = "form",
            cascade = CascadeType.ALL
    )
    @org.hibernate.annotations.SQLRestriction("is_deleted = false")
    @OrderBy("fieldOrder ASC")
    private List<FormField> fields = new ArrayList<>();

    private LocalDateTime publishedAt;

    public void addField(FormField field) {
        fields.add(field);
        field.setForm(this);
    }

    public void removeField(FormField field) {
        fields.remove(field);
        field.setForm(null);
    }
}
