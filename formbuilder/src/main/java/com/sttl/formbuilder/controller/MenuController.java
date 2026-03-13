package com.sttl.formbuilder.controller;

import com.sttl.formbuilder.common.ApiResponse;
import com.sttl.formbuilder.common.ApiResponseUtil;
import com.sttl.formbuilder.dto.MenuItemDTO;
import com.sttl.formbuilder.service.MenuService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    /**
     * Returns the sidebar menu for the currently logged-in user.
     * Returns an empty list for unauthenticated users.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuItemDTO>>> getMenu(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletRequest req) {

        String username = currentUser != null ? currentUser.getUsername() : null;
        List<MenuItemDTO> menu = username != null
                ? menuService.getMenuForUser(username)
                : List.of();

        return ApiResponseUtil.success(menu, "Menu fetched", req);
    }
}
