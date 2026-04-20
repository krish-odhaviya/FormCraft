package com.sttl.formbuilder.mapper;

import com.sttl.formbuilder.dto.ModuleRequestDTO;
import com.sttl.formbuilder.dto.ModuleResponseDTO;
import com.sttl.formbuilder.entity.Module;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * Mapper for Module entity.
 * Handles recursive child mapping and parent relationship flattening.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ModuleMapper {

    @Mapping(target = "parentId", source = "parentModule.id")
    @Mapping(target = "parentName", source = "parentModule.moduleName")
    @Mapping(target = "subParentId", source = "subParentModule.id")
    @Mapping(target = "parent", source = "parentFlag")
    @Mapping(target = "subParent", source = "subParentFlag")
    @Mapping(target = "children", source = "childModules")
    ModuleResponseDTO toResponse(Module entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "parentModule", ignore = true)
    @Mapping(target = "subParentModule", ignore = true)
    @Mapping(target = "parentFlag", source = "parent")
    @Mapping(target = "subParentFlag", source = "subParent")
    Module toEntity(ModuleRequestDTO request);
}
