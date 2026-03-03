package com.sttl.formbuilder.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())   // disable CSRF
                .authorizeHttpRequests(auth -> auth
                                .requestMatchers("/api/forms/upload").permitAll()
                                .requestMatchers("/api/forms/files/**").permitAll()
                                .anyRequest().permitAll()

                )

                .formLogin(form -> form.disable())   // disable login page
                .httpBasic(basic -> basic.disable()); // disable basic auth

        return http.build();
    }
}