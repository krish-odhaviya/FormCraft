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
                        // ── CORS pre-flight ───────────────────────────────
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ── Auth endpoints ────────────────────────────────
                        .requestMatchers("/auth/login", "/auth/logout", "/auth/register").permitAll()

                        // ── Swagger ───────────────────────────────────────
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // ── File APIs ─────────────────────────────────────
                        .requestMatchers("/forms/upload", "/forms/files/**").authenticated()

                        // ── Public form APIs ──────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/forms/lookup").permitAll()
                        .requestMatchers(HttpMethod.GET, "/forms/published-list").permitAll()
                        .requestMatchers(HttpMethod.GET, "/forms/code/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/forms/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/forms/submit").permitAll()
                        .requestMatchers(HttpMethod.POST, "/forms/*/evaluate").permitAll()

                        // ── Admin APIs ────────────────────────────────────
                        .requestMatchers(HttpMethod.GET,    "/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.POST,   "/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/modules/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.GET,    "/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.POST,   "/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/roles/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")

                        .requestMatchers("/admin/**").hasAnyRole("ADMIN", "SYSTEM_ADMIN")

                        // ── Everything else ───────────────────────────────
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