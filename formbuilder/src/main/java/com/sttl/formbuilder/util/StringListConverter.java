package com.sttl.formbuilder.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        // Converts ["Option 1", "Option 2"] to "Option 1,Option 2"
        return String.join(",", list);
    }

    @Override
    public List<String> convertToEntityAttribute(String joinedData) {
        if (joinedData == null || joinedData.trim().isEmpty()) {
            return new ArrayList<>();
        }
        // Converts "Option 1,Option 2" back to ["Option 1", "Option 2"]
        return new ArrayList<>(Arrays.asList(joinedData.split(",")));
    }
}