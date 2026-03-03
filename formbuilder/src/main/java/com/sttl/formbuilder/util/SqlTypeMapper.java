package com.sttl.formbuilder.util;

public class SqlTypeMapper {

    public static String map(String type) {
        // Using toUpperCase() adds a safety net in case the frontend sends "text" instead of "TEXT"
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

            default -> throw new RuntimeException("Invalid form field type mapped: " + type);
        };
    }
}