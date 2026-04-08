package com.sttl.formbuilder.exception;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.sttl.formbuilder.common.ApiErrorDetail;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Object>> handleFormValidationException(
            ValidationException ex,
            HttpServletRequest request) {

        // Convert Map<fieldKey, errorMsg> to List<ApiErrorDetail>
        List<ApiErrorDetail> errors = ex.getErrors().entrySet().stream()
                .map(entry -> new ApiErrorDetail(entry.getKey(), entry.getValue()))
                .toList();

        return ApiResponseUtil.error(
                "Form validation failed",
                errors,
                HttpStatus.BAD_REQUEST,
                request
        );
    }

    // ✅ 1. Validation Error (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ApiErrorDetail(
                        error.getField(),
                        error.getDefaultMessage()))
                .toList();

        return ApiResponseUtil.error(
                "Validation failed",
                errors,
                HttpStatus.BAD_REQUEST,
                request
        );
    }

    // ✅ 2. ConstraintViolationException (Path param / Request param validation)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors = ex.getConstraintViolations()
                .stream()
                .map(violation -> new ApiErrorDetail(
                        violation.getPropertyPath().toString(),
                        violation.getMessage()))
                .toList();

        return ApiResponseUtil.error(
                "Validation failed",
                errors,
                HttpStatus.BAD_REQUEST,
                request
        );
    }

    // ✅ 3. Business Exception (Custom)
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusinessException(
            BusinessException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors =
                List.of(new ApiErrorDetail("business", ex.getMessage()));

        return ApiResponseUtil.error(
                ex.getMessage(),
                errors,
                ex.getStatus(),
                request
        );
    }

    // ✅ 4. Entity Not Found
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleEntityNotFound(
            EntityNotFoundException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors =
                List.of(new ApiErrorDetail("resource", ex.getMessage()));

        return ApiResponseUtil.error(
                "Resource not found",
                errors,
                HttpStatus.NOT_FOUND,
                request
        );
    }

    // ✅ 5. Database Constraint Violation (Unique key etc.)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors =
                List.of(new ApiErrorDetail("database",
                        ex.getMostSpecificCause().getMessage()));

        return ApiResponseUtil.error(
                "Database constraint violation",
                errors,
                HttpStatus.BAD_REQUEST,
                request
        );
    }

    // ✅ 6. Illegal Argument
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors =
                List.of(new ApiErrorDetail("invalid_argument", ex.getMessage()));

        return ApiResponseUtil.error(
                ex.getMessage(),
                errors,
                HttpStatus.BAD_REQUEST,
                request
        );
    }

    // ✅ 8. Optimistic Locking Error
    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Object>> handleOptimisticLocking(
            org.springframework.dao.OptimisticLockingFailureException ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors =
                List.of(new ApiErrorDetail("concurrency", "The record has been modified by another user or session."));

        return ApiResponseUtil.error(
                "Conflict detected: Please refresh and try again.",
                errors,
                HttpStatus.CONFLICT,
                request
        );
    }

    // ✅ 7. Generic Exception (Fallback)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(
            Exception ex,
            HttpServletRequest request) {

        List<ApiErrorDetail> errors =
                List.of(new ApiErrorDetail("server", ex.getMessage()));

        return ApiResponseUtil.error(
                "Internal Server Error",
                errors,
                HttpStatus.INTERNAL_SERVER_ERROR,
                request
        );
    }
}