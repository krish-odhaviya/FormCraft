package com.sttl.formbuilder.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "modules")
public class Module {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String moduleName;

    @Column(length = 500)
    private String description;

    /** Frontend route prefix e.g. /forms/new */
    @Column(length = 255)
    private String prefix;

    /** Lucide icon name or CSS class e.g. "file-text", "shield" */
    @Column(length = 120)
    private String iconCss;

    /** True if this is a top-level collapsible parent group */
    @Column(name = "is_parent", nullable = false)
    private boolean parentFlag = false;

    /** True if this acts as a second-level group under a parent */
    @Column(name = "is_sub_parent", nullable = false)
    private boolean subParentFlag = false;

    /** null → top-level parent */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Module parentModule;

    /** null → second-level nesting reference */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_parent_id")
    private Module subParentModule;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private int sortOrder = 0;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
