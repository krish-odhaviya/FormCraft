package com.sttl.formbuilder.util;

public class SqlTypeMapper {

    public static String map(String type) {
        return switch (type.toUpperCase()) {

            // Standard short strings
            case "TEXT", "EMAIL", "RADIO", "DROPDOWN" -> "VARCHAR(255)";

            // Long strings or JSON/Comma-separated arrays
            case "TEXTAREA", "CHECKBOX_GROUP" -> "TEXT";

            // Numbers
            case "INTEGER" -> "INTEGER";
            case "DECIMAL" -> "NUMERIC";

            // Dates and Times
            case "DATE" -> "DATE";
            case "TIME" -> "TIME";

            // True/False
            case "BOOLEAN" -> "BOOLEAN";

            // ── NEW TYPES ──────────────────────────────────────────────

            // Star rating stores a numeric value e.g. 3 out of 5
            case "STAR_RATING" -> "SMALLINT";

            // Linear scale stores the selected number e.g. 4
            case "LINEAR_SCALE" -> "SMALLINT";

            // File upload stores the file path / URL string
            case "FILE_UPLOAD" -> "VARCHAR(500)";

            // MC Grid stores a JSON object: { "Row 1": "Col 2", "Row 2": "Col 1" }
            case "MC_GRID" -> "JSONB";

            // Tick Box Grid stores a JSON object: { "Row 1": ["Col 1", "Col 3"] }
            case "TICK_BOX_GRID" -> "JSONB";

            case "LOOKUP_DROPDOWN" -> "VARCHAR(500)";

            case "SECTION",
                 "LABEL",
                 "PAGE_BREAK" -> "TEXT";

            default -> throw new RuntimeException("Invalid form field type mapped: " + type);
        };
    }
}