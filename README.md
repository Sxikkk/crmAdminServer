# CRM Admin Server (TypeScript)

Admin server for processing organization creation requests before sending approved data to the main CRM server.

## Features

- Public endpoint to create an organization request.
- Internal staff authentication (register/login via JWT).
- Request moderation flow: approve/reject.
- Email notifications for request lifecycle.
- On approval, sends request to main CRM create endpoint (CreateOrganizationCommand contract).
- Direct management of organizations in main CRM DB (list/update type/status).
- Separate admin DB (`CRMAdmin`) and main DB (`CRM`).

## Stack

- Node.js + TypeScript
- Fastify
- PostgreSQL (`pg`)
- Zod validation
- JWT + bcrypt
- Nodemailer

## Configuration

Copy `.env.example` to `.env` and update values.

Required variables:

- `POSTGRES_ADMIN`
- `POSTGRES_MAIN`
- `JWT_SECRET`
- `MAIN_CRM_CREATE_ORG_URL`

Connection string supports both:

- URI (`postgres://...`)
- Npgsql style (`Host=...;Port=...;Database=...;Username=...;Password=...`)

## Run

```bash
npm install
npm run migrate
npm run seed:admin
npm run dev
```

Server:

- API base: `http://localhost:4100/api`
- Docs: `http://localhost:4100/docs`
- Health: `http://localhost:4100/health`

## Frontend (React)

Frontend is in `web/` (Vite + React + TypeScript).

```bash
cd web
npm install
copy .env.example .env
npm run dev
```

UI runs on `http://localhost:5174`.

## Main endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/requests` (public)
- `GET /api/requests` (auth)
- `GET /api/requests/:id` (auth)
- `POST /api/requests/:id/approve` (auth)
- `POST /api/requests/:id/reject` (auth)
- `GET /api/organizations` (auth)
- `PATCH /api/organizations/:id/type` (auth)
- `PATCH /api/organizations/:id/status` (auth)

## Create Organization Contract (Main CRM)

Approval uses:

```json
{
  "organizationName": "string",
  "organizationType": "Company | Individual | Other",
  "inn": "string | null",
  "ogrn": "string | null",
  "email": "string | null",
  "phone": "string | null",
  "website": "string | null"
}
```

## Notes

- `city` is stored in admin request but not sent to main CRM because the current contract does not include it.
- If sending to main CRM fails on approve, request is marked as `FAILED` and requester gets a failure email.
