package com.sttl.formbuilder.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String username;
    private boolean enabled;
    private String customRoleName;
    private Long customRoleId;
}
