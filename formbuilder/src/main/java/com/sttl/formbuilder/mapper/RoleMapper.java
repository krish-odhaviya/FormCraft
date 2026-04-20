package com.sttl.formbuilder.mapper;

import com.sttl.formbuilder.dto.RoleRequestDTO;
import com.sttl.formbuilder.dto.RoleResponseDTO;
import com.sttl.formbuilder.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * Mapper for Role entity.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoleMapper {

    @Mapping(target = "moduleIds", ignore = true)
    @Mapping(target = "assignedUserCount", ignore = true)
    RoleResponseDTO toResponse(Role entity);

    @Mapping(target = "id", ignore = true)
    Role toEntity(RoleRequestDTO request);
}
