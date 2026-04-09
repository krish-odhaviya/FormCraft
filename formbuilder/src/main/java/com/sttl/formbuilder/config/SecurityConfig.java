package com.sttl.formbuilder.config;

import com.sttl.formbuilder.constant.ApiEndpoints;

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
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

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
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> {
                    CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
                    requestHandler.setCsrfRequestAttributeName(null);
                    
                    CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
                    repository.setCookiePath("/");
                    
                    csrf
                        .csrfTokenRepository(repository)
                        .csrfTokenRequestHandler(requestHandler)
                        .ignoringRequestMatchers(
                                ApiEndpoints.AUTH_BASE + "/**", 
                                ApiEndpoints.FORMS_BASE + "/**", 
                                ApiEndpoints.RUNTIME_BASE + "/**"
                        );
                })
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .maximumSessions(1)
                        .sessionRegistry(sessionRegistry())
                )
                .securityContext(ctx -> ctx
                        .securityContextRepository(sessionSecurityContextRepository())
                )
                .authenticationProvider(authenticationProvider())
                .authorizeHttpRequests(auth -> auth
                        // ── CORS pre-flight ───────────────────────────────
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ── Auth endpoints ────────────────────────────────
                        .requestMatchers(
                                ApiEndpoints.AUTH_LOGIN, 
                                ApiEndpoints.AUTH_LOGOUT, 
                                ApiEndpoints.AUTH_REGISTER
                        ).permitAll()

                        // ── Swagger ───────────────────────────────────────
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // ── File APIs ─────────────────────────────────────
                        .requestMatchers(ApiEndpoints.FORMS_BASE + "/upload").authenticated()
                        .requestMatchers(ApiEndpoints.FORMS_BASE + "/files/**").permitAll()

                        // ── Public form APIs ──────────────────────────────
                        .requestMatchers(HttpMethod.GET,  ApiEndpoints.FORMS_LOOKUP_ABS).permitAll()
                        .requestMatchers(HttpMethod.GET,  ApiEndpoints.FORMS_PUBLISHED).permitAll()
                        .requestMatchers(HttpMethod.GET,  ApiEndpoints.FORMS_BASE + "/code/**").permitAll()
                        .requestMatchers(HttpMethod.GET,  ApiEndpoints.FORMS_BASE + "/*").permitAll()
                        .requestMatchers(HttpMethod.POST, ApiEndpoints.FORMS_BASE + ApiEndpoints.SUBMIT).permitAll()
                        .requestMatchers(HttpMethod.POST, ApiEndpoints.FORMS_BASE + "/*/evaluate").permitAll()

                        // ── SRS §4.1 Runtime Form Endpoints ───────────────
                        // GET form definition by code — allow anonymous (visibility enforced in controller)
                         .requestMatchers(HttpMethod.GET,  ApiEndpoints.RUNTIME_BASE + "/**").permitAll()
                         .requestMatchers(HttpMethod.POST, ApiEndpoints.RUNTIME_BASE + ApiEndpoints.SUBMIT_PATH).permitAll()

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
                .httpBasic(basic -> basic.disable())
                .addFilterBefore(new CsrfCookieFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN", "Cookie", "Accept"));
        config.setExposedHeaders(List.of("X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Filter to ensure the CSRF token is sent to the frontend cookie.
     * In Spring Security 6, the token is otherwise "deferred" and won't be sent until used.
     */
    private static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                // Accessing the token triggers the CookieCsrfTokenRepository to write the cookie
                csrfToken.getToken();
            }
            filterChain.doFilter(request, response);
        }
    }
}