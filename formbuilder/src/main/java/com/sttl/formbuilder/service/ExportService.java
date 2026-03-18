package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.SubmissionsResponse;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.itextpdf.text.Document;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

@Service
public class ExportService {

    /**
     * Exports submission data to the requested format (csv, pdf, word).
     */
    public ResponseEntity<byte[]> export(SubmissionsResponse data, String format) {
        try {
            return switch (format.toLowerCase()) {
                case "pdf"  -> exportPdf(data);
                case "word" -> exportWord(data);
                default     -> exportCsv(data);
            };
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── CSV ───────────────────────────────────────────────────────────────────

    private ResponseEntity<byte[]> exportCsv(SubmissionsResponse data) {
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
        return buildResponse(bytes, "text/csv", "submissions.csv");
    }

    // ── PDF ───────────────────────────────────────────────────────────────────

    private ResponseEntity<byte[]> exportPdf(SubmissionsResponse data) throws Exception {
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
            table.addCell(new Phrase(String.valueOf(row.getOrDefault("id", ""))));
            for (var col : data.getColumns()) {
                Object val = row.get(col.getFieldKey());
                table.addCell(new Phrase(val == null ? "" : String.valueOf(val)));
            }
        }

        document.add(table);
        document.close();

        return buildResponse(out.toByteArray(), "application/pdf", "submissions.pdf");
    }

    // ── Word ──────────────────────────────────────────────────────────────────

    private ResponseEntity<byte[]> exportWord(SubmissionsResponse data) throws Exception {
        XWPFDocument document = new XWPFDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        document.createParagraph().createRun().setText("Form Submissions Export");

        int numColumns = data.getColumns().size() + 1;
        int numRows = data.getRows().size() + 1;
        XWPFTable table = document.createTable(numRows, numColumns);

        // Header row
        XWPFTableRow headerRow = table.getRow(0);
        headerRow.getCell(0).setText("ID");
        int colIdx = 1;
        for (var col : data.getColumns()) {
            headerRow.getCell(colIdx++).setText(col.getFieldLabel());
        }

        // Data rows
        int rowIdx = 1;
        for (var dataRow : data.getRows()) {
            XWPFTableRow tableRow = table.getRow(rowIdx++);
            tableRow.getCell(0).setText(String.valueOf(dataRow.getOrDefault("id", "")));
            colIdx = 1;
            for (var col : data.getColumns()) {
                Object val = dataRow.get(col.getFieldKey());
                tableRow.getCell(colIdx++).setText(val == null ? "" : String.valueOf(val));
            }
        }

        document.write(out);
        document.close();

        return buildResponse(
                out.toByteArray(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "submissions.docx"
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseEntity<byte[]> buildResponse(byte[] bytes, String mediaType, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(mediaType));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(bytes.length);
        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}