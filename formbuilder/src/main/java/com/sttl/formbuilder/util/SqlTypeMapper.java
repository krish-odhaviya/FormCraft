package com.sttl.formbuilder.util;

public class SqlTypeMapper {

    public static String map(String type) {
        return switch (type.toUpperCase()) {

            // Standard short strings
            case "TEXT", "EMAIL", "RADIO" -> "VARCHAR(255)";

            // Long strings
            case "TEXTAREA" -> "TEXT";
            
            // Multiple selection or complex objects stored as JSONB
            case "CHECKBOX_GROUP", "CHECKBOX", "CHECKBOXES", "MC_GRID", "TICK_BOX_GRID", "GRID", "CHECKBOX_GRID", "DROPDOWN", "LOOKUP_DROPDOWN" -> "JSONB";

            // Numbers
            // NUMERIC(20,10) handles INTEGER (truncated at save), DECIMAL, and PERCENTAGE
            case "INTEGER" -> "NUMERIC(20,10)";

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

            case "SECTION",
                 "LABEL",
                 "PAGE_BREAK" -> "TEXT";

            default -> throw new RuntimeException("Invalid form field type mapped: " + type);
        };
    }
}