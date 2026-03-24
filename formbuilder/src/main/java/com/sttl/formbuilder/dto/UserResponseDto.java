package com.sttl.formbuilder.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class UserResponseDto {
    private UUID id;
    private String username;
    private boolean enabled;
    private String customRoleName;
    private UUID customRoleId;
}
