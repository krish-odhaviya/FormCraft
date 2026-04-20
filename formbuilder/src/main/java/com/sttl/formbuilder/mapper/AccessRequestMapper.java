package com.sttl.formbuilder.mapper;

import com.sttl.formbuilder.dto.AccessRequestDTO;
import com.sttl.formbuilder.dto.AccessRequestResponseDTO;
import com.sttl.formbuilder.entity.AccessRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * Mapper for AccessRequest entity.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AccessRequestMapper {

    @Mapping(target = "user.id", source = "user.id")
    @Mapping(target = "user.username", source = "user.username")
    @Mapping(target = "form.id", source = "form.id")
    @Mapping(target = "form.name", source = "form.name")
    @Mapping(target = "processedBy.id", source = "processedBy.id")
    @Mapping(target = "processedBy.username", source = "processedBy.username")
    AccessRequestResponseDTO toResponse(AccessRequest entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "form", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "status", constant = "PENDING")
    AccessRequest toEntity(AccessRequestDTO request);
}
