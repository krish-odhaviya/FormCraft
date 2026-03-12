package com.sttl.formbuilder.dto;

import com.sttl.formbuilder.Enums.SystemRole;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String username;
    private SystemRole role;
    private boolean enabled;
}
