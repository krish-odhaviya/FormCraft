package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.ModuleRequestDTO;
import com.sttl.formbuilder.dto.ModuleResponseDTO;
import com.sttl.formbuilder.service.ModuleService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/modules")
@RequiredArgsConstructor
public class ModuleController {

    private final ModuleService moduleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ModuleResponseDTO>>> getAll(HttpServletRequest req) {
        return ApiResponseUtil.success(moduleService.getAllModules(), "Modules fetched", req);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ModuleResponseDTO>> create(
            @jakarta.validation.Valid @RequestBody ModuleRequestDTO dto, HttpServletRequest req) {
        return ApiResponseUtil.success(moduleService.createModule(dto), "Module created", req);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ModuleResponseDTO>> update(
            @PathVariable Long id, @jakarta.validation.Valid @RequestBody ModuleRequestDTO dto, HttpServletRequest req) {
        return ApiResponseUtil.success(moduleService.updateModule(id, dto), "Module updated", req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        moduleService.deleteModule(id);
        return ApiResponseUtil.success(null, "Module deleted", req);
    }
}
