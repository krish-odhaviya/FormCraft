package com.sttl.formbuilder.config;

import com.sttl.formbuilder.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public HttpSessionSecurityContextRepository sessionSecurityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .maximumSessions(1)
                )
                .securityContext(ctx -> ctx
                        .securityContextRepository(sessionSecurityContextRepository())
                )
                .authenticationProvider(authenticationProvider())
                .authorizeHttpRequests(auth -> auth
                        // ── Public Access (CORS, Auth, Static) ───────────────────────────
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/logout", "/api/auth/register").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/api/forms/upload", "/api/forms/files/**").permitAll()
                        .requestMatchers("/api/debug/**").permitAll()

                        // ── Public Form View/Submit Endpoints ──────────────────────────────
                        // (Internal logic in Service/PermissionService should handle visibility)
                        .requestMatchers(HttpMethod.GET, "/api/forms/lookup", "/api/forms/published-list").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/forms/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/forms/*/view").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/forms/*/published").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/forms/submit").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/forms/*/evaluate").permitAll()
                        
                        // Final fallback for GET forms (just in case)
                        .requestMatchers(HttpMethod.GET, "/api/forms/**").permitAll()

                        // ── Admin-only system management ──────────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/modules", "/api/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/roles", "/api/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/modules", "/api/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/modules", "/api/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/modules", "/api/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/roles", "/api/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/roles", "/api/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/roles", "/api/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")

                        // ── Everything else requires a valid session ───────────────────────
                        .anyRequest().authenticated()
                )

                // ── Return 401 instead of redirect for unauthenticated API calls ──
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )

                // ── Disable form login and basic auth ─────────────────────────────
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));   // Next.js dev server
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);   // CRITICAL — allows session cookie to be sent
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}