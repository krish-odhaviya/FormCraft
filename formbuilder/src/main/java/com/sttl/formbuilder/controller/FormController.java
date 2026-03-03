package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.service.FormSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.entity.Form;
import com.sttl.formbuilder.entity.FormVersion;
import com.sttl.formbuilder.service.FormService;
import com.sttl.formbuilder.service.VersionService;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forms")
public class FormController {

    private final FormService formService;
    private final VersionService versionService;
    private final FormSubmissionService formSubmissionService;

    public FormController(FormService formService,
                          VersionService versionService, FormSubmissionService formSubmissionService) {
        this.formService = formService;
        this.versionService = versionService;
        this.formSubmissionService = formSubmissionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Form>>> getAllForms(
            HttpServletRequest request) {

        System.out.println("getAllFrom called");
        List<Form> forms = formService.getAllForms();


        System.out.println(forms);

        return ApiResponseUtil.success(
                forms,
                "Forms fetched successfully",
                request
        );
    }

    @GetMapping("/{formId}")
    public ResponseEntity<ApiResponse<FormDetailsResponse>> getForm(
            @PathVariable Long formId,
            HttpServletRequest request) {

        System.out.println("getForm called");

        FormDetailsResponse response =
                formService.getFormWithStructure(formId);

        return ApiResponseUtil.success(
                response,
                "Form fetched successfully",
                request
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Form>> createForm(
            @Valid @RequestBody CreateFormRequest requestBody,
            HttpServletRequest request) {

        System.out.println("createFrom called");

        Form form = formService.createForm(
                requestBody.getName(),
                requestBody.getDescription()
        );

        return ApiResponseUtil.success(
                form,
                "Form created successfully",
                request
        );
    }

    @PostMapping("/{formId}/versions")
    public ResponseEntity<ApiResponse<FormVersion>> createDraftVersion(
            @PathVariable Long formId,
            HttpServletRequest request) {

        System.out.println("createDraftVersion called");

        FormVersion version =
                versionService.createDraftVersion(formId);

        return ApiResponseUtil.success(
                version,
                "Draft version created successfully",
                request
        );
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitForm(
            @RequestBody SubmitFormRequest request,
            HttpServletRequest httprequest
    ) {

        try {
            // Pass the data to the service
            formSubmissionService.submit(request.getVersionId(), request.getValues());

            // Return a valid JSON success message so React's res.ok passes
            return ResponseEntity.ok(Map.of("status", "success"));

        } catch (Exception e) {
            // CRITICAL FOR DEBUGGING: This prints the exact reason for the 500 error in your terminal
            System.err.println("SUBMISSION FAILED: " + e.getMessage());
            e.printStackTrace();

            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @GetMapping("/{formId}/submissions")
    public ResponseEntity<ApiResponse<SubmissionsResponse>> getSubmissions(@PathVariable Long formId, HttpServletRequest request) {
        SubmissionsResponse response = formSubmissionService.getSubmissions(formId);

        return ApiResponseUtil.success(
                response,
                "Fields reordered successfully",
                request
        );
    }

    @DeleteMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<ApiResponse<String>> deleteSubmission(@PathVariable Long formId,
                                                                @PathVariable Long submissionId,
                                                                HttpServletRequest request) {
        formSubmissionService.softDeleteSubmission(formId, submissionId);
        return ApiResponseUtil.success(
                "Row deleted successfully",
                "Fields reordered successfully",
                request
        );
    }

    // ── Upload file ───────────────────────────────────────────────────────────────
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {

        try {
            // Storage directory — change this path if needed
            String uploadDir = "uploads/form-files";
            Path uploadPath = Paths.get(uploadDir);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Sanitize filename and make it unique
            String originalFilename = file.getOriginalFilename()
                    .replaceAll("[^a-zA-Z0-9._-]", "_");
            String uniqueFilename = System.currentTimeMillis() + "_" + originalFilename;
            Path filePath = uploadPath.resolve(uniqueFilename);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Build full URL to store in DB
            String baseUrl = request.getScheme() + "://" + request.getServerName()
                    + ":" + request.getServerPort();
            String fileUrl = baseUrl + "/api/forms/files/" + uniqueFilename;

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "url", fileUrl,
                    "filename", uniqueFilename
            ));

        } catch (IOException e) {
            System.err.println("File upload failed: " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", "File upload failed"));
        }
    }

    // ── Download / serve file ─────────────────────────────────────────────────────
    @GetMapping("/files/{filename}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String filename,
            HttpServletRequest request) {

        try {
            Path filePath = Paths.get("uploads/form-files").resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            // Try to determine content type
            String contentType = null;
            try {
                contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
            } catch (IOException ex) {
                contentType = "application/octet-stream";
            }
            if (contentType == null) contentType = "application/octet-stream";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }


}