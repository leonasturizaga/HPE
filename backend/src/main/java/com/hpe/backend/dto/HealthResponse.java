package com.hpe.backend.dto;

/**
 * Response body for GET /api/health.
 */
public record HealthResponse(String status) {

    public static HealthResponse ok() {
        return new HealthResponse("ok");
    }
}
