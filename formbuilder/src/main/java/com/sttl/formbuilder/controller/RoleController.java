package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.RoleRequestDTO;
import com.sttl.formbuilder.dto.RoleResponseDTO;
import com.sttl.formbuilder.service.RoleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleResponseDTO>>> getAll(HttpServletRequest req) {
        return ApiResponseUtil.success(roleService.getAllRoles(), "Roles fetched", req);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleResponseDTO>> create(
            @Valid @RequestBody RoleRequestDTO dto, HttpServletRequest req) {
        return ApiResponseUtil.success(roleService.createRole(dto), "Role created", req);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleResponseDTO>> update(
            @PathVariable java.util.UUID id, @Valid @RequestBody RoleRequestDTO dto, HttpServletRequest req) {
        return ApiResponseUtil.success(roleService.updateRole(id, dto), "Role updated", req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable java.util.UUID id, HttpServletRequest req) {
        roleService.deleteRole(id);
        return ApiResponseUtil.success(null, "Role deleted", req);
    }

    @GetMapping("/{id}/modules")
    public ResponseEntity<ApiResponse<List<java.util.UUID>>> getRoleModules(
            @PathVariable java.util.UUID id, HttpServletRequest req) {
        return ApiResponseUtil.success(roleService.getModuleIdsByRole(id), "Role modules fetched", req);
    }

    @PostMapping("/{id}/modules")
    public ResponseEntity<ApiResponse<Void>> assignModules(
            @PathVariable java.util.UUID id, @RequestBody Map<String, List<java.util.UUID>> body, HttpServletRequest req) {
        roleService.assignModulesToRole(id, body.get("moduleIds"));
        return ApiResponseUtil.success(null, "Modules assigned", req);
    }

    @PostMapping("/{roleId}/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> assignRoleToUser(
            @PathVariable java.util.UUID roleId, @PathVariable java.util.UUID userId, HttpServletRequest req) {
        roleService.assignRoleToUser(userId, roleId);
        return ApiResponseUtil.success(null, "Role assigned to user", req);
    }
}
