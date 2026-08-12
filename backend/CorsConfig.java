package com.hpe.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS is restricted to the frontend origin(s) configured via
 * app.cors.allowed-origins, which is backed by the FRONTEND_ORIGIN
 * environment variable (see application.yml). This lets us point at
 * localhost in dev and the real Vercel URL in production without any
 * code change — just an env var update per environment.
 *
 * Multiple origins can be supplied as a comma-separated list, e.g.
 * FRONTEND_ORIGIN=https://app.example.com,https://staging.example.com
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public CorsConfig(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
