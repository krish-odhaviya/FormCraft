package com.sttl.formbuilder.dto;

import com.sttl.formbuilder.entity.FormVersion;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ActivateVersionResult {
    private FormVersion version;
    private int draftsDropped;
}
