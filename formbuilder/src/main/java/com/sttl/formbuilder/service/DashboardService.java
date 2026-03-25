package com.sttl.formbuilder.service;

import com.sttl.formbuilder.Enums.FormStatusEnum;
import com.sttl.formbuilder.Enums.VisibilityType;
import com.sttl.formbuilder.dto.DashboardStatsResponse;
import com.sttl.formbuilder.dto.DashboardStatsResponse.RecentFormDto;
import com.sttl.formbuilder.entity.FormSubmissionMeta;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.FormRepository;
import com.sttl.formbuilder.repository.FormSubmissionMetaRepository;
import com.sttl.formbuilder.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final FormRepository formRepository;
    private final FormSubmissionMetaRepository submissionMetaRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public DashboardStatsResponse getStats(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        boolean isAdmin = permissionService.canManageSystem(user);
        
        long totalForms;
        long draftForms;
        long publishedForms;
        long totalSubmissions;

        if (isAdmin) {
            totalForms = formRepository.count();
            draftForms = formRepository.countByStatus(FormStatusEnum.DRAFT);
            publishedForms = formRepository.countByStatus(FormStatusEnum.PUBLISHED);
            totalSubmissions = submissionMetaRepository.countAllNonDeletedSubmitted(FormSubmissionMeta.SubmissionStatus.SUBMITTED);
        } else {
            totalForms = formRepository.countByOwner(user);
            draftForms = formRepository.countByOwnerAndStatus(user, FormStatusEnum.DRAFT);
            publishedForms = formRepository.countByOwnerAndStatus(user, FormStatusEnum.PUBLISHED);
            totalSubmissions = submissionMetaRepository.countSubmissionsAccessibleToUser(user, FormSubmissionMeta.SubmissionStatus.SUBMITTED);
        }

        var recentForms = formRepository.findTop5RecentAccessibleToUser(user, VisibilityType.PUBLIC, VisibilityType.LINK, PageRequest.of(0, 5))
                .stream()
                .map(f -> RecentFormDto.builder()
                        .id(f.getId())
                        .formName(f.getName() != null ? f.getName() : "Untitled")
                        .status(f.getStatus() != null ? f.getStatus().name() : "DRAFT")
                        .updatedAt(f.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .totalForms(totalForms)
                .draftForms(draftForms)
                .publishedForms(publishedForms)
                .totalSubmissions(totalSubmissions)
                .recentForms(recentForms)
                .build();
    }
}
