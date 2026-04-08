package com.sttl.formbuilder;

import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormField;
import com.sttl.formbuilder.entity.FormSubmissionMeta;
import com.sttl.formbuilder.entity.FormSubmissionMeta.SubmissionStatus;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.exception.BusinessException;
import com.sttl.formbuilder.repository.*;
import com.sttl.formbuilder.service.FormSubmissionService;
import com.sttl.formbuilder.service.RuleEngineService;
import com.sttl.formbuilder.service.SchemaService;
import com.sttl.formbuilder.service.ExpressionEvaluatorService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FormConcurrencyTest {

    @Mock private FormRepository formRepository;
    @Mock private FormSubmissionMetaRepository submissionMetaRepository;
    @Mock private FormVersionRepository formVersionRepository;
    @Mock private FormFieldRepository fieldRepository;
    @Mock private RuleEngineService ruleEngineService;
    @Mock private SchemaService schemaService;
    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private FieldValidationRepository validationRepository;
    @Mock private ExpressionEvaluatorService expressionEvaluator;

    @InjectMocks
    private FormSubmissionService formSubmissionService;

    @Test
    public void testSubmitConcurrentDraft_ShouldThrowConflict() {
        // Arrange
        UUID formId = UUID.randomUUID();
        String username = "testuser";
        
        SubmitFormRequest request = new SubmitFormRequest();
        request.setFormId(formId);
        request.setValues(Collections.singletonMap("first_name", "John"));

        Form form = new Form();
        form.setId(formId);
        form.setTableName("form_test");

        FormVersion version = new FormVersion();
        version.setId(UUID.randomUUID());

        FormField field = new FormField();
        field.setFieldKey("first_name");
        field.setFieldType("TEXT");

        FormSubmissionMeta meta = new FormSubmissionMeta();
        meta.setStatus(SubmissionStatus.DRAFT);

        when(formRepository.findById(formId)).thenReturn(Optional.of(form));
        when(formVersionRepository.findByFormIdAndIsActive(formId, true)).thenReturn(Optional.of(version));
        when(fieldRepository.findByFormVersionIdAndIsDeletedFalseOrderByFieldOrder(any())).thenReturn(List.of(field));
        when(schemaService.detectDrift(any(), any())).thenReturn(Collections.emptyList());
        when(validationRepository.findByFormVersionOrderByExecutionOrderAsc(any())).thenReturn(Collections.emptyList());
        
        when(submissionMetaRepository.findByFormIdAndSubmittedByAndStatusAndIsDeletedFalse(eq(formId), eq(username), eq(SubmissionStatus.DRAFT)))
                .thenReturn(Optional.of(meta));
        
        // Simulate Optimistic Locking Failure
        doThrow(new OptimisticLockingFailureException("Conflict"))
                .when(submissionMetaRepository).save(any(FormSubmissionMeta.class));

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            formSubmissionService.submit(request, username);
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals("Submission failed: This draft has already been submitted or modified by another session.", exception.getMessage());
    }
}
