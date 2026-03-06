package com.sttl.formbuilder.service;

import com.sttl.formbuilder.dto.internal.FormRuleDTO;
import com.sttl.formbuilder.dto.internal.RuleConditionDTO;
import com.sttl.formbuilder.dto.internal.RuleActionDTO;
import com.sttl.formbuilder.entity.FormField;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.sttl.formbuilder.exception.ValidationException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * RuleEngineService — Server-Side Logic Rule Evaluation Engine
 *
 * What it does:
 * Evaluates the IF→THEN logic rules attached to a form version when a submission
 * is received.
 */
@Service
public class RuleEngineService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Reuses condition logic from the client to enforce conditional validation.
     * Evaluates a single {@link FormRuleDTO} representing a field's condition.
     *
     * @param cond The condition rules.
     * @param formValues   The full map of submitted {columnName: value} pairs.
     * @return truthiness of the condition passing.
     */
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

    /**
     * Determines whether a field should be shown/enabled (and therefore validated)
     * based on its conditions and the provided form values.
     * @param cond The conditional logic object for the field (action, logic, rules)
     * @param formValues The form values to evaluate against
     * @return true if the field should be considered active (visible/enabled), false if inactive (hidden/disabled)
     */
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
        String fieldValue = (rawVal != null) ? String.valueOf(rawVal).trim() : "";
        String ruleValueStr = (rule.getValue() != null) ? String.valueOf(rule.getValue()).trim() : "";

        try {
            switch (rule.getOperator()) {
                case "equals":
                    return fieldValue.equals(ruleValueStr);
                case "notEquals":
                    return !fieldValue.equals(ruleValueStr);
                case "contains":
                    return fieldValue.toLowerCase().contains(ruleValueStr.toLowerCase());
                case "greaterThan":
                    return Double.parseDouble(fieldValue) > Double.parseDouble(ruleValueStr);
                case "lessThan":
                    return Double.parseDouble(fieldValue) < Double.parseDouble(ruleValueStr);
                case "isEmpty":
                    return fieldValue.isEmpty();
                case "isNotEmpty":
                    return !fieldValue.isEmpty();
                default:
                    return false;
            }
        } catch (NumberFormatException e) {
            // Safe fallback for parsing errors in numeric comparisons
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
            System.out.println("[RuleEngine] Field: " + field.getFieldKey());
            System.out.println("[RuleEngine] Actions count: " + rule.getActions().size());
            rule.getActions().forEach(a -> System.out.println(
                "[RuleEngine]   Action → type=" + a.getType() +
                " targetField=" + a.getTargetField() +
                " value=" + a.getValue() +
                " message=" + a.getMessage()));
            // ──────────────────────────────────────────────────────────────────────

            // Check condition (evaluates ALL rules for match based on logic).
            boolean isMatch = evaluateRule(rule, answers);
            System.out.println("[RuleEngine] isMatch=" + isMatch + " | answers=" + answers);

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
                    } else if ("REGEX_MATCH".equalsIgnoreCase(action.getType())) {
                        Object targetValue = answers.get(action.getTargetField());
                        String pattern = action.getValue();
                        if (targetValue != null && pattern != null && !pattern.trim().isEmpty()) {
                            String targetStr = targetValue.toString().trim();
                            if (!targetStr.isEmpty()) {
                                try {
                                    if (!java.util.regex.Pattern.compile(pattern).matcher(targetStr).matches()) {
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
