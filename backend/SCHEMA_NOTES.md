# Draft Schema Notes (NOT implemented — no entities, no migrations)

This is a forward-looking sketch only, so future work has a starting point.
Nothing here is wired up yet: no JPA entities, no Flyway/Liquibase migration,
no `spring-boot-starter-data-jpa` dependency. That all comes in a later task
once upload/results endpoints are actually being built.

## `users` (only needed once optional auth ships)

| column         | type          | notes                                  |
|----------------|---------------|-----------------------------------------|
| id             | uuid / bigint | PK                                      |
| email          | varchar       | unique, nullable until auth exists      |
| password_hash  | varchar       | null for OAuth-only users               |
| display_name   | varchar       |                                          |
| created_at     | timestamptz   |                                          |

Guests never get a row here — guest mode means "no user_id on the result."

## `results` (pose estimation runs)

| column          | type          | notes                                                        |
|-----------------|---------------|----------------------------------------------------------------|
| id              | uuid / bigint | PK                                                              |
| user_id         | uuid / bigint | nullable FK -> users.id (null = guest result)                  |
| media_type      | varchar       | `IMAGE` \| `VIDEO`                                              |
| original_key    | varchar       | object storage key/path, NOT the binary itself                 |
| overlay_key     | varchar       | object storage key/path for the skeleton-overlay output         |
| status          | varchar       | `PENDING` \| `PROCESSING` \| `DONE` \| `FAILED`                 |
| pose_metadata   | jsonb         | keypoints / confidence scores, if we persist them              |
| created_at      | timestamptz   |                                                                  |
| expires_at      | timestamptz   | nullable — useful if guest results should auto-expire           |

## Guiding principles for later

- **Binary media never touches Postgres.** `original_key` / `overlay_key`
  point at S3-compatible object storage (Cloudflare R2 / AWS S3); Postgres
  only stores metadata and references.
- **Guest mode is a null `user_id`, not a separate table.** Keeps the results
  table and query logic simple, and makes "claim my guest results after
  signing up" a straightforward `UPDATE ... SET user_id = ?` later.
- When we do implement this, it should land as a Flyway migration
  (`src/main/resources/db/migration/V1__init.sql`) plus matching JPA entities,
  introduced in the same task as the first endpoint that actually needs them.
