package com.sttl.formbuilder.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;


@RestController
@RequestMapping("/forms")
@RequiredArgsConstructor
public class FileController {


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
