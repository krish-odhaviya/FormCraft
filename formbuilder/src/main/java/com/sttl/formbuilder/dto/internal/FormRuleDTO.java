package com.sttl.formbuilder.dto.internal;

import lombok.Data;
import java.util.List;

@Data
public class FormRuleDTO {
    private String action;
    private String logic;
    private String formula;
    private String message;
    private List<RuleConditionDTO> rules;
    private List<RuleActionDTO> actions;
    
    public List<RuleConditionDTO> getConditions() {
        return rules;
    }
}
