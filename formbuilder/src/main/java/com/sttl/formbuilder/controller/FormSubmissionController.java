package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiErrorDetail;
import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.PagedSubmissionsResponse;
import com.sttl.formbuilder.dto.SubmissionsResponse;
import com.sttl.formbuilder.dto.SubmitFormRequest;
import com.sttl.formbuilder.exception.ValidationException;
import com.sttl.formbuilder.service.FormSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import com.itextpdf.text.Document;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormSubmissionController {

    private final FormSubmissionService formSubmissionService;

    // ── Submit form ───────────────────────────────────────────────────────────
    @PostMapping("/submit")
    public ResponseEntity<?> submitForm(
            @RequestBody SubmitFormRequest request,
            HttpServletRequest httprequest
    ) {
        try {
            formSubmissionService.submit(request.getFormId(), request.getValues());
            return ApiResponseUtil.success("Submitted successfully", "Form submitted successfully", httprequest);
        } catch (ValidationException e) {
            List<ApiErrorDetail> errors = e.getErrors().entrySet().stream()
                    .map(entry -> new ApiErrorDetail(entry.getKey(), entry.getValue()))
                    .toList();
            return ApiResponseUtil.error("Form validation failed", errors, HttpStatus.BAD_REQUEST, httprequest);
        } catch (Exception e) {
            System.err.println("SUBMISSION FAILED: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    /**
     * GET /api/forms/{formId}/submissions
     *
     * Spring automatically builds Pageable from query params:
     *   ?page=0       — page number (0-based)
     *   &size=10      — rows per page
     *   &sort=id,desc — column and direction
     *   &search=john  — global search string
     *
     * Examples:
     *   /api/forms/1/submissions?page=0&size=10&sort=id,desc
     *   /api/forms/1/submissions?page=1&size=25&sort=name_1,asc&search=john
     */
    @GetMapping("/{formId}/submissions")
    public ResponseEntity<ApiResponse<PagedSubmissionsResponse>> getSubmissions(
            @PathVariable Long formId,
            @RequestParam(defaultValue = "") String search,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
            HttpServletRequest request
    ) {
        PagedSubmissionsResponse response = formSubmissionService.getSubmissionsPaged(
                formId, search, pageable
        );
        return ApiResponseUtil.success(response, "Submissions fetched successfully", request);
    }

    /**
     * GET /api/forms/{formId}/submissions/export
     *
     * Returns ALL matching rows as a downloadable file (CSV, PDF, or Word).
     * Respects search filter but no pagination.
     *
     *   ?search=john — optional, same search used in table
     *   ?format=csv|pdf|word — optional, defaults to csv
     */
    @GetMapping("/{formId}/submissions/export")
    public ResponseEntity<byte[]> exportSubmissions(
            @PathVariable Long formId,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "csv") String format
    ) {
        SubmissionsResponse data = formSubmissionService.exportSubmissions(formId, search);
        
        try {
            if ("pdf".equalsIgnoreCase(format)) {
                return generatePdfExport(data);
            } else if ("word".equalsIgnoreCase(format)) {
                return generateWordExport(data);
            } else {
                return generateCsvExport(data);
            }
        } catch (Exception e) {
            System.err.println("EXPORT FAILED: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // ── Generate CSV ──────────────────────────────────────────────────────────
    private ResponseEntity<byte[]> generateCsvExport(SubmissionsResponse data) {

        StringBuilder csv = new StringBuilder();

        // Header row
        csv.append("ID");
        for (var col : data.getColumns()) {
            csv.append(",").append(escapeCsv(col.getFieldLabel()));
        }
        csv.append("\n");

        // Data rows
        for (var row : data.getRows()) {
            csv.append(row.getOrDefault("id", ""));
            for (var col : data.getColumns()) {
                Object val = row.get(col.getFieldKey());
                csv.append(",").append(escapeCsv(val == null ? "" : String.valueOf(val)));
            }
            csv.append("\n");
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "submissions.csv");
        headers.setContentLength(bytes.length);

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }
    
    // ── Generate PDF ──────────────────────────────────────────────────────────
    private ResponseEntity<byte[]> generatePdfExport(SubmissionsResponse data) throws Exception {
        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);
        document.open();

        document.add(new Paragraph("Form Submissions Export\n\n"));

        int numColumns = data.getColumns().size() + 1;
        PdfPTable table = new PdfPTable(numColumns);
        table.setWidthPercentage(100);

        // Header
        table.addCell(new PdfPCell(new Phrase("ID")));
        for (var col : data.getColumns()) {
            table.addCell(new PdfPCell(new Phrase(col.getFieldLabel())));
        }

        // Rows
        for (var row : data.getRows()) {
            table.addCell(new Phrase((row.getOrDefault("id", "")).toString()));
            for (var col : data.getColumns()) {
                Object val = row.get(col.getFieldKey());
                table.addCell(new Phrase(val == null ? "" : String.valueOf(val)));
            }
        }

        document.add(table);
        document.close();

        byte[] bytes = out.toByteArray();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "submissions.pdf");
        headers.setContentLength(bytes.length);

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    // ── Generate Word Document ────────────────────────────────────────────────
    private ResponseEntity<byte[]> generateWordExport(SubmissionsResponse data) throws Exception {
        XWPFDocument document = new XWPFDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        document.createParagraph().createRun().setText("Form Submissions Export");

        int numColumns = data.getColumns().size() + 1;
        int numRows = data.getRows().size() + 1; // Header + data
        XWPFTable table = document.createTable(numRows, numColumns);

        // Header
        XWPFTableRow headerRow = table.getRow(0);
        headerRow.getCell(0).setText("ID");
        int colIdx = 1;
        for (var col : data.getColumns()) {
            headerRow.getCell(colIdx++).setText(col.getFieldLabel());
        }

        // Rows
        int rowIdx = 1;
        for (var dataRow : data.getRows()) {
            XWPFTableRow tableRow = table.getRow(rowIdx++);
            tableRow.getCell(0).setText((dataRow.getOrDefault("id", "")).toString());
            colIdx = 1;
            for (var col : data.getColumns()) {
                Object val = dataRow.get(col.getFieldKey());
                tableRow.getCell(colIdx++).setText(val == null ? "" : String.valueOf(val));
            }
        }

        document.write(out);
        document.close();

        byte[] bytes = out.toByteArray();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        headers.setContentDispositionFormData("attachment", "submissions.docx");
        headers.setContentLength(bytes.length);

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    // ── Delete submission ─────────────────────────────────────────────────────
    @DeleteMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<ApiResponse<String>> deleteSubmission(
            @PathVariable Long formId,
            @PathVariable Long submissionId,
            HttpServletRequest request
    ) {
        formSubmissionService.softDeleteSubmission(formId, submissionId);
        return ApiResponseUtil.success("Row deleted successfully", "Submission deleted successfully", request);
    }

    // ── Bulk Delete submissions ───────────────────────────────────────────────
    @PostMapping("/{formId}/submissions/bulk-delete")
    public ResponseEntity<ApiResponse<String>> bulkDeleteSubmissions(
            @PathVariable Long formId,
            @RequestBody List<Long> submissionIds,
            HttpServletRequest request
    ) {
        formSubmissionService.softDeleteSubmissionsBulk(formId, submissionIds);
        return ApiResponseUtil.success("Rows deleted successfully", "Submissions deleted successfully", request);
    }

    // ── CSV escape helper ─────────────────────────────────────────────────────
    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}