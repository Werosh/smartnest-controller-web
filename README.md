# SmartNest V1 — DIY Smart Home Dashboard

University IoT project — **web application only**. Hardware (ESP32 hub + ESP8266 modules) is a separate team's responsibility.

## Architecture

```
ESP8266 ⇄ HiveMQ Cloud (MQTT, TLS)
              ⇅
     MQTT Bridge Worker (Node.js on Render)
              ⇅
       Supabase (Postgres + Realtime)
              ⇅
    React Dashboard (hosted on Netlify)
```

---

## Quick Start (local dev)

### Prerequisites
- Node.js 18+
- A Supabase project (already provisioned at `https://dcwszmpeelcdtdioedhi.supabase.co`)

### 1. Run the Supabase schema

Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/dcwszmpeelcdtdioedhi/sql/new) and paste the contents of `supabase/schema.sql`. Run it.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — sign up with any email/password.

### 3. Promote yourself to admin

After signing up, grab your UUID from [Supabase Auth users](https://supabase.com/dashboard/project/dcwszmpeelcdtdioedhi/auth/users) and run in SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<your-uuid>';
```

Refresh the app — you'll see the **Admin** nav item appear.

### 4. Start the bridge worker

```bash
cd bridge-worker
npm install
```

**Add your Supabase service role key** to `bridge-worker/.env`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # from Supabase Dashboard → Project Settings → API → service_role
```

```bash
node index.js
```

You'll see:
```
╔══════════════════════════════════════════════╗
║          SmartNest V1 — Bridge Worker        ║
╚══════════════════════════════════════════════╝
  Mode : 🤖 SIMULATOR (mock hardware)
```

Toggle a module in the dashboard — within ~4 seconds, live watts will appear with no page refresh.

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://dcwszmpeelcdtdioedhi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_fJO-YMjv-VMJRaO2wkWxeA_GJFq5qsu` |

### Bridge Worker (`bridge-worker/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** — from Supabase Dashboard → Project Settings → API |
| `MQTT_URL` | Leave blank for simulator mode. Set to `mqtts://<id>.hivemq.cloud:8883` for real hardware |
| `MQTT_USERNAME` | HiveMQ username |
| `MQTT_PASSWORD` | HiveMQ password |
| `SIMULATE_HARDWARE` | `true` to run mock data (default); `false` for real MQTT |
| `SPIKE_THRESHOLD_WATTS` | Alert threshold in watts (default `1200`) |

---

## Deployment

### Frontend → Netlify

1. Push the repo to GitHub
2. Connect to Netlify → New site from Git → select repo
3. **Build settings:**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
4. **Environment variables** (Netlify dashboard → Site configuration → Env vars):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

The `frontend/netlify.toml` already has the SPA redirect rule.

### Bridge Worker → Render

1. Create a new **Background Worker** on [render.com](https://render.com)
2. Root directory: `bridge-worker`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Set all bridge worker env vars in Render's dashboard
6. For always-on (required for MQTT), use Render's paid tier or Railway

---

## MQTT Contract (for hardware team)

| Topic | Direction | Payload |
|---|---|---|
| `smartnest/<module-id>/power` | Device → Bridge | Watts as string, e.g. `"256"` |
| `smartnest/<module-id>/state` | Device → Bridge | `"ON"` or `"OFF"` |
| `smartnest/<module-id>/cmd`   | Bridge → Device | `"ON"` or `"OFF"` |

`<module-id>` must match the `id` column in the `modules` table.

---

## Roles

| Role | Permissions |
|---|---|
| `user` | View dashboard, toggle modules, set timers, Turn Off All |
| `admin` | Everything above + register/delete modules, manage user roles |

First signup is always `user`. Promote to `admin` manually (see above), then admins can promote others from the Admin page.

---

## Monitoring

Datadog RUM is integrated. Visit [app.datadoghq.com](https://app.datadoghq.com) to see:
- Session replays (20% sample rate)
- Resource timing
- User interactions
- Long tasks

Service: `smartnest` | Application ID: `a35f3ad0-0141-4502-b5e4-10f8eb78114b`

---

## Project Structure

```
smartnest/
  bridge-worker/
    index.js          — main entry, MQTT ↔ Supabase bridge
    mockDevice.js     — hardware simulator
    .env              — local env (add your service role key!)
    .env.example      — template
    package.json
  supabase/
    schema.sql        — run once in Supabase SQL editor
  frontend/
    src/
      main.jsx        — entry, Datadog RUM init
      App.jsx         — routing + auth guards
      lib/
        supabaseClient.js
        AuthContext.jsx
      pages/
        Login.jsx
        Dashboard.jsx
        Admin.jsx
      components/
        Sidebar.jsx
        TopBar.jsx
        StatCard.jsx
        ModuleCard.jsx
        EnergyChart.jsx
        AlertsPanel.jsx
        SchedulesPanel.jsx
        QuickActions.jsx
        CircularGauge.jsx
        AddModuleModal.jsx
    index.html
    tailwind.config.js
    vite.config.js
    netlify.toml
    .env             — VITE_SUPABASE_* credentials
    package.json
  README.md
```
