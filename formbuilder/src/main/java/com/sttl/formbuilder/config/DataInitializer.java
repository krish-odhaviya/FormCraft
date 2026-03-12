package com.sttl.formbuilder.config;

import com.sttl.formbuilder.Enums.SystemRole;
import com.sttl.formbuilder.entity.User;
import com.sttl.formbuilder.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(SystemRole.ADMIN);
            admin.setEnabled(true);
            userRepository.save(admin);
            System.out.println("Seeded admin user: admin / admin123");
        }
    }
}
