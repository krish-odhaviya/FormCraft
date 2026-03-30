package com.sttl.formbuilder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "field_validations")
@Getter
@Setter
public class FieldValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_version_id", nullable = false)
    private FormVersion formVersion;

    @Column(nullable = false)
    private String scope; // 'FIELD' | 'FORM'

    @Column(nullable = true)
    private String fieldKey; // target field for FIELD scope, optional for FORM scope

    @Column(nullable = false, columnDefinition = "TEXT")
    private String expression;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false)
    private Integer executionOrder = 0;
}
