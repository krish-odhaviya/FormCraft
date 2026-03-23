package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.SubmissionsResponse;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFCell;
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

    /** Characters that trigger formula injection in spreadsheet applications. */
    private static final String[] FORMULA_PREFIXES = {"=", "+", "-", "@", "\t", "\r"};

    /**
     * Exports submission data to the requested format (csv, pdf, word, xlsx).
     */
    public ResponseEntity<byte[]> export(SubmissionsResponse data, String format) {
        try {
            return switch (format.toLowerCase()) {
                case "pdf"  -> exportPdf(data);
                case "word" -> exportWord(data);
                case "xlsx" -> exportXlsx(data);
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
            csv.append(escapeCsv(String.valueOf(row.getOrDefault("id", ""))));
            for (var col : data.getColumns()) {
                Object val = row.get(col.getFieldKey());
                csv.append(",").append(escapeCsv(val == null ? "" : String.valueOf(val)));
            }
            csv.append("\n");
        }

        // UTF-8 BOM for Excel compatibility
        byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] content = csv.toString().getBytes(StandardCharsets.UTF_8);
        byte[] bytes = new byte[bom.length + content.length];
        System.arraycopy(bom, 0, bytes, 0, bom.length);
        System.arraycopy(content, 0, bytes, bom.length, content.length);

        return buildResponse(bytes, "text/csv;charset=UTF-8", "submissions.csv");
    }

    // ── XLSX ──────────────────────────────────────────────────────────────────

    private ResponseEntity<byte[]> exportXlsx(SubmissionsResponse data) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Submissions");

            // Header
            XSSFRow headerRow = sheet.createRow(0);
            XSSFCell idHeader = headerRow.createCell(0);
            idHeader.setCellValue("ID");
            int col = 1;
            for (var column : data.getColumns()) {
                XSSFCell cell = headerRow.createCell(col++);
                cell.setCellValue(column.getFieldLabel());
            }

            // Data rows
            int rowNum = 1;
            for (var row : data.getRows()) {
                XSSFRow dataRow = sheet.createRow(rowNum++);
                dataRow.createCell(0).setCellValue(String.valueOf(row.getOrDefault("id", "")));
                int colIdx = 1;
                for (var column : data.getColumns()) {
                    Object val = row.get(column.getFieldKey());
                    XSSFCell cell = dataRow.createCell(colIdx++);
                    cell.setCellValue(val == null ? "" : String.valueOf(val));
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return buildResponse(
                    out.toByteArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "submissions.xlsx"
            );
        }
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

    /**
     * Escapes a CSV value and prevents CSV/formula injection.
     * <ul>
     *   <li>Wraps commas, quotes and newlines in double-quotes.</li>
     *   <li>Prefixes formula-injection characters (=, +, -, @) with a single quote
     *       so spreadsheet applications do not execute them as formulas.</li>
     * </ul>
     */
    private String escapeCsv(String value) {
        if (value == null || value.isEmpty()) return "";

        // CSV injection prevention: prefix formula indicators with '
        for (String prefix : FORMULA_PREFIXES) {
            if (value.startsWith(prefix)) {
                value = "'" + value;
                break;
            }
        }

        // Standard CSV escaping
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}