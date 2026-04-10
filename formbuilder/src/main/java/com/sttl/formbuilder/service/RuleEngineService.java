package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.internal.FormRuleDTO;
import com.sttl.formbuilder.dto.internal.RuleConditionDTO;
import com.sttl.formbuilder.dto.internal.RuleActionDTO;
import com.sttl.formbuilder.entity.FormField;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.sttl.formbuilder.exception.ValidationException;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Service
public class RuleEngineService {

    private final ObjectMapper objectMapper = new ObjectMapper();


    public boolean evaluateRule(FormRuleDTO cond, Map<String, Object> formValues) {
        if (cond == null || cond.getRules() == null || cond.getRules().isEmpty()) {
            return true;
        }

        boolean passed;
        if ("OR".equalsIgnoreCase(cond.getLogic())) {
            passed = false;
            for (RuleConditionDTO rule : cond.getRules()) {
                if(evaluateCondition(rule, formValues)) {
                    passed = true;
                    break;
                }
            }
        } else {
            passed = true;
            for (RuleConditionDTO rule : cond.getRules()) {
                if(!evaluateCondition(rule, formValues)) {
                    passed = false;
                    break;
                }
            }
        }

        return passed;
    }


     public boolean isFieldActive(FormRuleDTO cond, Map<String, Object> formValues) {
        if (cond == null || cond.getRules() == null || cond.getRules().isEmpty()) {
            return true; // No conditions = active
        }

        boolean passed = evaluateRule(cond, formValues);

        switch (cond.getAction().toLowerCase()) {
            case "show":    return passed;
            case "hide":    return !passed;
            case "enable":  return true; // We validate enabled/disabled fields same way for now, but in UI disabled might not be submitted.
            case "disable": return true; // Keep it true, unless we decide disabled means "no validation". If disabled fields shouldn't be required, return !passed.
            case "calculate": return true; 
            default:        return true;
        }
     }

    private boolean evaluateCondition(RuleConditionDTO rule, Map<String, Object> formValues) {
        if (rule.getFieldKey() == null || rule.getFieldKey().trim().isEmpty()) {
            return false;
        }

        Object rawVal = formValues.get(rule.getFieldKey());
        List<String> fieldValues = new ArrayList<>();
        
        if (rawVal instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) rawVal;
            if (map.get("value") != null) fieldValues.add(String.valueOf(map.get("value")).trim());
            if (map.get("id") != null) fieldValues.add(String.valueOf(map.get("id")).trim());
            if (map.get("label") != null) fieldValues.add(String.valueOf(map.get("label")).trim());
        } else if (rawVal instanceof List) {
            List<?> list = (List<?>) rawVal;
            for (Object item : list) {
                if (item instanceof Map) {
                    Map<?, ?> map = (Map<?, ?>) item;
                    if (map.get("value") != null) fieldValues.add(String.valueOf(map.get("value")).trim());
                    if (map.get("id") != null) fieldValues.add(String.valueOf(map.get("id")).trim());
                    if (map.get("label") != null) fieldValues.add(String.valueOf(map.get("label")).trim());
                } else if (item != null) {
                    fieldValues.add(String.valueOf(item).trim());
                }
            }
        } else if (rawVal != null) {
            fieldValues.add(String.valueOf(rawVal).trim());
        }

        String ruleValueStr = (rule.getValue() != null) ? String.valueOf(rule.getValue()).trim() : "";
        String firstValue = fieldValues.isEmpty() ? "" : fieldValues.get(0);

        try {
            switch (rule.getOperator()) {
                case "equals":
                    return fieldValues.contains(ruleValueStr);
                case "notEquals":
                    return !fieldValues.contains(ruleValueStr);
                case "contains":
                    for (String fv : fieldValues) {
                        if (fv.toLowerCase().contains(ruleValueStr.toLowerCase())) return true;
                    }
                    return false;
                case "greaterThan":
                    return Double.parseDouble(firstValue) > Double.parseDouble(ruleValueStr);
                case "lessThan":
                    return Double.parseDouble(firstValue) < Double.parseDouble(ruleValueStr);
                case "isEmpty":
                    return fieldValues.isEmpty();
                case "isNotEmpty":
                    return !fieldValues.isEmpty();
                default:
                    return false;
            }
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Validates a submission against all custom rules in the form fields.
     */
    public void validateSubmission(List<FormField> fields, Map<String, Object> answers) {
        if (fields == null || fields.isEmpty()) return;

        Map<String, String> errors = new LinkedHashMap<>();

        for (FormField field : fields) {
            if (field.getConditions() == null || field.getConditions().trim().isEmpty()) continue;

            FormRuleDTO rule;
            try {
                rule = objectMapper.readValue(field.getConditions(), FormRuleDTO.class);
            } catch (Exception e) {
                continue; // Skip invalid JSON
            }

            if (rule.getActions() == null || rule.getActions().isEmpty()) continue;

            // ── DEBUG LOGGING ──────────────────────────────────────────────────────
            log.debug("[RuleEngine] Field: {}", field.getFieldKey());
            log.debug("[RuleEngine] Actions count: {}", rule.getActions().size());
            rule.getActions().forEach(a -> log.debug(
                "[RuleEngine]   Action → type={} targetField={} value={} message={}",
                a.getType(), a.getTargetField(), a.getValue(), a.getMessage()));
            // ──────────────────────────────────────────────────────────────────────

            // Check condition (evaluates ALL rules for match based on logic).
            boolean isMatch = evaluateRule(rule, answers);
            log.debug("[RuleEngine] isMatch={} | answers={}", isMatch, answers);

            if (isMatch) {
                for (RuleActionDTO action : rule.getActions()) {
                    if (action == null || action.getType() == null) continue;

                    if ("VALIDATION_ERROR".equalsIgnoreCase(action.getType())) {
                        String msg = action.getMessage() != null && !action.getMessage().isEmpty() 
                                     ? action.getMessage() 
                                     : "Validation error on " + field.getFieldKey();
                        errors.put(field.getFieldKey(), msg);
                    } else if ("REQUIRE".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        if (targetValue == null || targetValue.toString().trim().isEmpty()) {
                            String reqMsg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                    ? action.getMessage()
                                    : "Validation Error: '" + action.getTargetField() + "' is a required field.";
                            errors.put(action.getTargetField(), reqMsg);
                        }
                    } else if ("MIN_LENGTH".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        try {
                            int minLen = Integer.parseInt(action.getValue());
                            if (targetValue != null && targetValue.toString().trim().length() < minLen && targetValue.toString().trim().length() > 0) {
                                String msg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                        ? action.getMessage() 
                                        : "'" + action.getTargetField() + "' must be at least " + minLen + " characters.";
                                errors.put(action.getTargetField(), msg);
                            }
                        } catch (NumberFormatException ignored) {}
                    } else if ("MAX_LENGTH".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        try {
                            int maxLen = Integer.parseInt(action.getValue());
                            if (targetValue != null && targetValue.toString().trim().length() > maxLen) {
                                String msg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                        ? action.getMessage() 
                                        : "'" + action.getTargetField() + "' cannot exceed " + maxLen + " characters.";
                                errors.put(action.getTargetField(), msg);
                            }
                        } catch (NumberFormatException ignored) {}
                    } else if ("MIN_VALUE".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        try {
                            double minVal = Double.parseDouble(action.getValue());
                            if (targetValue != null && targetValue.toString().trim().length() > 0) {
                                double actualVal = Double.parseDouble(targetValue.toString());
                                if (actualVal < minVal) {
                                    String msg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                            ? action.getMessage() 
                                            : "'" + action.getTargetField() + "' must be at least " + minVal + ".";
                                    errors.put(action.getTargetField(), msg);
                                }
                            }
                        } catch (NumberFormatException ignored) {}
                    } else if ("MAX_VALUE".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        try {
                            double maxVal = Double.parseDouble(action.getValue());
                            if (targetValue != null && targetValue.toString().trim().length() > 0) {
                                double actualVal = Double.parseDouble(targetValue.toString());
                                if (actualVal > maxVal) {
                                    String msg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                            ? action.getMessage() 
                                            : "'" + action.getTargetField() + "' cannot exceed " + maxVal + ".";
                                    errors.put(action.getTargetField(), msg);
                                }
                            }
                        } catch (NumberFormatException ignored) {}
                    } else if ("REGEX_MATCH".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        String pattern = action.getValue();
                        if (targetValue != null && pattern != null && !pattern.trim().isEmpty()) {
                            String targetStr = targetValue.toString().trim();
                            if (!targetStr.isEmpty()) {
                                try {
                                    if (!Pattern.compile(pattern).matcher(targetStr).matches()) {
                                        String msg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                                ? action.getMessage() 
                                                : "'" + action.getTargetField() + "' is not in a valid format.";
                                        errors.put(action.getTargetField(), msg);
                                    }
                                } catch (java.util.regex.PatternSyntaxException ignored) {}
                            }
                        }
                    } else if ("MATCH_FIELD".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        Object matchValue = answers.get(action.getValue());
                        if (action.getValue() != null && !action.getValue().trim().isEmpty()) {
                            String targetStr = targetValue != null ? targetValue.toString() : "";
                            String matchStr = matchValue != null ? matchValue.toString() : "";
                            if (!targetStr.equals(matchStr)) {
                                String msg = action.getMessage() != null && !action.getMessage().trim().isEmpty() 
                                        ? action.getMessage() 
                                        : "Fields do not match.";
                                errors.put(action.getTargetField(), msg);
                            }
                        }
                    }
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }

    /**
     * Executes post-submission workflow actions.
     */
    public void executePostSubmissionWorkflows(List<FormField> fields, Map<String, Object> answers) {
        if (fields == null || fields.isEmpty()) return;

        for (FormField field : fields) {
            if (field.getConditions() == null || field.getConditions().trim().isEmpty()) continue;

            FormRuleDTO rule;
            try {
                rule = objectMapper.readValue(field.getConditions(), FormRuleDTO.class);
            } catch (Exception e) {
                continue;
            }

            if (rule.getActions() == null || rule.getActions().isEmpty()) continue;
            
            boolean isMatch = evaluateRule(rule, answers);

            if (isMatch) {
                for (RuleActionDTO action : rule.getActions()) {
                    // Logic for post-submission workflows can go here. For example: webhook integration, etc.
                }
            }
        }
    }
}
