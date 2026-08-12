# Deploying `/backend` to Render (Web Service, free tier)

Render needs access to your GitHub repo and account, which I can't act on
directly — these are the exact steps to do it yourself; it's about 5 minutes.

## 1. Push this code
Commit the `/backend` folder to your GitHub repo (same monorepo as the
frontend) and push.

## 2. Create the Web Service on Render
1. Render dashboard → **New +** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `backend`  (this makes every command below relative
     to `/backend`, so you don't need to prefix paths)
   - **Runtime**: `Docker` is not needed — pick **Native / Java** if offered,
     otherwise use the **Build/Start command** fields below with **Java** runtime.
   - **Build Command**:
     ```
     mvn clean package -DskipTests
     ```
   - **Start Command**:
     ```
     java -jar target/backend.jar
     ```
     (the jar name is pinned in `pom.xml` via `<finalName>backend</finalName>`,
     so this path won't shift with the version number)
4. **Environment** tab → add these variables:
   | Key | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `FRONTEND_ORIGIN` | your Vercel URL, e.g. `https://your-app.vercel.app` |

   Render sets `PORT` automatically — don't add it yourself, `application.properties`
   already reads it (`${PORT:8080}`).
5. Instance type: **Free**
6. Create Web Service and wait for the build/deploy to finish.

## 3. Verify
Render gives you a public URL like `https://hpe-backend.onrender.com`.
Confirm:
```
curl https://hpe-backend.onrender.com/api/health
# -> {"status":"ok"}
```

## Notes for the team / QA
- **Cold starts**: on the free tier, the service spins down after ~15 minutes
  of inactivity. The first request after idle can take 30–60s while it wakes
  up. This is expected for V1 — don't file it as a bug. If it becomes a
  problem before we upgrade the plan, a scheduled ping (e.g. a free
  cron-job.dev hit to `/api/health` every 10 min) is the usual workaround —
  not implemented here since it's outside this task's scope.
- **CORS**: if the frontend gets CORS errors, double check `FRONTEND_ORIGIN`
  in Render's Environment tab matches the deployed Vercel URL exactly
  (no trailing slash).
- **Local run**: `mvn spring-boot:run` from `/backend` starts on
  `http://localhost:8080` with profile `local` (default), allowing
  `http://localhost:5173` by default.
