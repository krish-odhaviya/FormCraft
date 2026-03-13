package com.sttl.formbuilder.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ApiResponseUtil {

    private static final String API_VERSION = "v1";

    public static <T> ResponseEntity<ApiResponse<T>> success(
            T data,
            String message,
            HttpServletRequest request) {

        ApiResponse<T> response = ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .errors(null)
                .meta(buildMeta(HttpStatus.OK, request))
                .build();

        return ResponseEntity.ok(response);
    }

    public static <T> ResponseEntity<ApiResponse<T>> error(
            String message,
            List<ApiErrorDetail> errors,
            HttpStatus status,
            HttpServletRequest request) {

        ApiResponse<T> response = ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .errors(errors)
                .meta(buildMeta(status, request))
                .build();

        return new ResponseEntity<>(response, status);
    }

    private static ApiMeta buildMeta(
            HttpStatus status,
            HttpServletRequest request) {

        return ApiMeta.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .path(request != null ? request.getRequestURI() : "N/A")
                .requestId(generateRequestId())
                .apiVersion(API_VERSION)
                .build();
    }

    private static String generateRequestId() {
        return "REQ-" + UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase();
    }

}
