package com.sttl.formbuilder.mapper;

import com.sttl.formbuilder.dto.CreateFormRequest;
import com.sttl.formbuilder.dto.FormDetailsResponse;
import com.sttl.formbuilder.dto.FormSummaryDTO;
import com.sttl.formbuilder.entity.Form;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * Mapper for Form entity.
 * Uses FieldMapper to handle nested field conversions if necessary.
 */
@Mapper(componentModel = "spring", uses = {FieldMapper.class}, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface FormMapper {

    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().name() : null)")
    @Mapping(target = "visibility", expression = "java(entity.getVisibility() != null ? entity.getVisibility().name() : \"PUBLIC\")")
    @Mapping(target = "ownerName", source = "owner.username")
    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "fields", ignore = true)
    FormDetailsResponse toResponse(Form entity);

    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().name() : null)")
    @Mapping(target = "visibility", expression = "java(entity.getVisibility() != null ? entity.getVisibility().name() : \"PUBLIC\")")
    @Mapping(target = "ownerUsername", source = "owner.username")
    @Mapping(target = "canEdit", ignore = true)
    @Mapping(target = "canViewSubmissions", ignore = true)
    FormSummaryDTO toSummary(Form entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "DRAFT")
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "createdByUsername", ignore = true)
    Form toEntity(CreateFormRequest request);
}
