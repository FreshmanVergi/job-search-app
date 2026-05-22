# Job Search Application — SE4458 Final Project

A kariyer.net-style job search platform built with microservices architecture.

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────────────────────────────────────────┐
│   Frontend   │────▶│                   API Gateway :3000                   │
│  (Next.js)   │     │  Rate limiting · JWT auth · Route proxying            │
│   Vercel     │     └──────────────┬───────────────────┬────────────────────┘
└──────────────┘                    │                   │
                                    │                   │
          ┌─────────────────────────▼──┐   ┌────────────▼────────────────┐
          │   Job Posting Service :3001 │   │  Job Search Service :3002   │
          │  · CRUD for job postings    │   │  · Full-text search         │
          │  · Company management       │   │  · Recent searches (Mongo)  │
          │  · Application tracking     │   │  · Job alerts (Mongo)       │
          │  · Redis caching            │   │  · AI Agent (Claude)        │
          │  · RabbitMQ publisher       │   └─────────────────────────────┘
          └─────────────────────────────┘
                        │
          ┌─────────────▼────────────────┐
          │   Notification Service :3003  │
          │  · Nightly cron jobs          │
          │  · RabbitMQ consumer          │
          │  · Email via Nodemailer       │
          └──────────────────────────────┘

External Services:
  Auth:      Supabase Auth (IAM)
  Database:  Supabase PostgreSQL
  NoSQL:     MongoDB Atlas (job searches, alerts)
  Cache:     Upstash Redis
  Queue:     CloudAMQP (RabbitMQ)
  Email:     Gmail SMTP / SendGrid
```

## 📂 Project Structure

```
job-search-app/
├── gateway/                     # API Gateway (Express)
├── services/
│   ├── job-posting-service/     # Job CRUD + Applications
│   ├── job-search-service/      # Search + AI Agent
│   └── notification-service/   # Cron jobs + Queue consumer
├── frontend/                    # Next.js 14 + Tailwind
├── docker-compose.yml
└── README.md
```

## 🗄️ Data Models (ER Diagram)

### PostgreSQL (Supabase)

**companies**
| Field       | Type    | Notes          |
|-------------|---------|----------------|
| id          | UUID PK |                |
| name        | VARCHAR | required       |
| logo_url    | TEXT    |                |
| website     | TEXT    |                |
| created_at  | TIMESTAMPTZ |            |

**jobs**
| Field                | Type    | Notes                          |
|----------------------|---------|--------------------------------|
| id                   | UUID PK |                               |
| company_id           | UUID FK | → companies                   |
| title                | VARCHAR | required, indexed (gin)        |
| description          | TEXT    | required                       |
| requirements         | TEXT    |                                |
| department           | VARCHAR |                                |
| position_level       | VARCHAR | junior/mid/senior/expert       |
| work_type            | VARCHAR | full-time/part-time/contract   |
| work_preference      | VARCHAR | on-site/remote/hybrid          |
| country              | VARCHAR | default: Türkiye               |
| city                 | VARCHAR | indexed                        |
| district             | VARCHAR |                                |
| application_count    | INT     | default 0                      |
| is_active            | BOOLEAN | default true                   |
| posted_by            | UUID    | supabase user id               |
| min_experience_years | INT     |                                |
| education_level      | VARCHAR |                                |
| military_status      | VARCHAR |                                |
| created_at           | TIMESTAMPTZ |                           |
| updated_at           | TIMESTAMPTZ |                           |

**applications**
| Field        | Type    | Notes          |
|--------------|---------|----------------|
| id           | UUID PK |                |
| job_id       | UUID FK | → jobs         |
| user_id      | UUID    | supabase user  |
| user_email   | VARCHAR |                |
| cover_letter | TEXT    |                |
| status       | VARCHAR | pending/reviewed/accepted/rejected |
| applied_at   | TIMESTAMPTZ |            |

### MongoDB Atlas

**JobSearch** collection
```json
{
  "userId": "string",
  "userEmail": "string",
  "query": {
    "position": "string",
    "city": "string",
    "country": "string",
    "workPreference": "string",
    "workType": "string"
  },
  "resultsCount": "number",
  "searchedAt": "Date"
}
```

**JobAlert** collection
```json
{
  "userId": "string",
  "userEmail": "string",
  "keywords": ["string"],
  "country": "string",
  "city": "string",
  "district": "string",
  "workPreference": "string",
  "workType": "string",
  "isActive": "boolean",
  "lastNotifiedAt": "Date"
}
```

## 🚀 Deployment

### Step 1: Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Run `services/job-posting-service/src/db/schema.sql` in SQL Editor
3. Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

### Step 2: External Services
- **MongoDB**: Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
- **Redis**: Create free DB at [upstash.com](https://upstash.com)
- **RabbitMQ**: Create free instance at [cloudamqp.com](https://cloudamqp.com)

### Step 3: Railway Deployment (Backend Services)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Deploy each service
cd gateway && railway up
cd services/job-posting-service && railway up
cd services/job-search-service && railway up
cd services/notification-service && railway up
```

Set environment variables in Railway dashboard for each service.

### Step 4: Vercel Deployment (Frontend)

```bash
cd frontend
npx vercel deploy --prod
```

Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel dashboard.

### Step 5: API Gateway Environment

```
JOB_POSTING_SERVICE_URL=https://job-posting.railway.app
JOB_SEARCH_SERVICE_URL=https://job-search.railway.app
NOTIFICATION_SERVICE_URL=https://notification.railway.app
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
FRONTEND_URL=https://your-app.vercel.app
```

## 🛠️ Local Development

```bash
# Copy .env.example files
cp gateway/.env.example gateway/.env
cp services/job-posting-service/.env.example services/job-posting-service/.env
cp services/job-search-service/.env.example services/job-search-service/.env
cp services/notification-service/.env.example services/notification-service/.env
cp frontend/.env.example frontend/.env

# Fill in your actual values, then:
docker-compose up --build

# Or run individually:
cd gateway && npm install && npm run dev
cd services/job-posting-service && npm install && npm run dev
cd services/job-search-service && npm install && npm run dev
cd services/notification-service && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## 🔑 Making Yourself Admin

After registering an account, update your user metadata in Supabase:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

## 📋 API Endpoints (v1)

All routes go through the API Gateway.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/v1/jobs` | — | List jobs (filterable, paginated) |
| GET | `/api/v1/jobs/:id` | — | Job detail + related |
| GET | `/api/v1/jobs/autocomplete?q=&type=` | — | Autocomplete |
| POST | `/api/v1/admin/jobs` | admin/company | Create job |
| PUT | `/api/v1/admin/jobs/:id` | admin/company | Update job |
| GET | `/api/v1/companies` | — | List companies |
| GET | `/api/v1/search` | optional | Search jobs (saves to Mongo if logged in) |
| GET | `/api/v1/recent-searches` | required | User's recent searches |
| POST | `/api/v1/applications` | required | Apply to a job |
| GET | `/api/v1/applications/my` | required | My applications |
| GET | `/api/v1/alerts` | required | My job alerts |
| POST | `/api/v1/alerts` | required | Create alert |
| DELETE | `/api/v1/alerts/:id` | required | Delete alert |
| POST | `/api/v1/ai/chat` | required | AI assistant chat |

## ⚙️ Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Job Alert Notifications | Daily 08:00 (TR) | Match new jobs with user alerts → email |
| Related Job Notifications | Daily 09:00 (TR) | Match new jobs with search history → email |

## 📝 Assumptions

1. Authentication is entirely delegated to Supabase Auth — no custom user table needed
2. User roles (`admin`, `company`, `user`) are stored in Supabase `user_metadata`
3. Email sending uses Gmail SMTP; SendGrid or AWS SES can be substituted
4. Payment processing is not implemented (per spec)
5. AI Agent uses Claude claude-sonnet-4-20250514 with live job data as context
6. Geolocation uses the browser's `navigator.geolocation` API + Nominatim for reverse geocoding (free, no API key)
7. Image upload for companies is left as a future enhancement (nice-to-have)

## 🐛 Known Issues / Limitations

- Autocomplete relies on database ILIKE queries; for production, Elasticsearch/Typesense would be better
- AI Agent context is limited to 10 jobs; a vector search would improve relevance
- Rate limiting is global (200 req/15min per IP); should be per-user in production
