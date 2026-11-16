# Periyar Taxi — Driver Hiring / Onboarding Upgrade

This update starts from the supplied ESM backend and the latest Center Picker Fix frontend.

## What was added

- A new full-page Drivers -> Create Driver form (`/drivers/new`), with branch, permanent/acting employment, DOB, joining date, experience, salary policy, username and generated/manual temporary password.
- Permanent address with optional Google Maps home pin, optional temporary address, emergency contact and reference contact.
- Licence number, expiry, classes, masked Aadhaar last four digits, background-check status, languages, blood group and optional internal notes.
- Up to 12 document categories in one `multipart/form-data` onboarding request (5 MB max per file): driver photo, licence front/back, masked Aadhaar front/back, address proof, police verification, medical fitness, experience, training, masked bank proof and signed employment agreement.
- Newly created drivers are **not available** for dispatch until verification approval and clock-in. Drivers are added with an `employeeCode` like `PTD-00001`.
- User password is **hashed with bcrypt**. Temporary password is shown only in the frontend success screen and not returned from the API. First driver login requires an authenticated password change. Existing sessions are invalidated after the change.
- Private local document storage outside frontend public directories; authenticated, branch-scoped file streaming. File type/magic checks and strict per-file limits.
- Staff Driver directory now has a Create Driver action, detailed review panel, missing-document upload and verification submission.
- A non-destructive additive database migration to extend existing `users` and `driver_profiles` tables.

## Installation on an existing database (REQUIRED)

1. Backup the existing `periyar_taxi` MySQL database before applying schema changes.
2. Replace backend/frontend files from the updated ZIPs. Keep your existing `.env` files and credentials. Do not copy `.env.example` over `.env`.
3. Backend terminal:

```bash
npm install
npm run db:migrate-driver
npm run check
npm test
npm run dev
```

4. Frontend terminal:

```bash
npm install
npm run check
npm run dev
```

5. Open Drivers > Create Driver in the Super Admin or authorized Branch Admin account. Assign the correct branch, fill in required fields, and upload masked documents. After creation, copy the generated/entered temporary credentials privately.
6. Review the newly created driver in the directory. Upload any missing documents and submit for verification before approval.
7. Driver signs in using their username and temporary password; the frontend forces the password change screen. Once complete the driver signs in again and can open My Documents. They still need admin approval before receiving ride offers.

`npm run db:init` is for creating tables on a **new empty development database**; **do not use it as a migration for an existing production database**. Use `db:migrate-driver` for this update.

## Routes

| Method | Endpoint | Role and permission | Purpose |
| --- | --- | --- | --- |
| POST | `/api/drivers/onboard` | Admin with `drivers.manage` or Super Admin | Create driver + profile + document uploads atomically |
| POST | `/api/drivers/:id/documents` | Admin with `drivers.manage` in assigned branch | Upload / replace documents |
| POST | `/api/drivers/me/documents` | Driver | Upload / replace own documents |
| GET | `/api/drivers/:id/documents/:key` | Authorized branch admin or owning driver | Private file download |
| POST | `/api/drivers/:id/submit` | Authorized branch admin | Submit completed driver documents for verification |
| POST | `/api/drivers/:id/verify` | Admin with `drivers.verify` | Approve/reject verified submission |
| POST | `/api/auth/change-password` | Logged-in account | Change password and revoke existing sessions |

The existing routes for `/api/drivers/me`, `/api/drivers/submit`, `/api/users`, salary, attendance, assignment and dispatch remain present.

## Security and operating notes

- Mask Aadhaar documents before uploading. Store only the last 4 digits as searchable text. Check local consent/verification obligations before collecting any identity documents.
- Google Maps/home address location, GPS duty tracking, payroll, SMS and Firebase are separate existing integrations; this upgrade does not enable them automatically.
- The new document store defaults to `backend/uploads/driver-private/<driverId>`; keep this outside web-served directories, exclude from Git, and ensure persistent private storage with backups and access controls in production.
- Administrators with `drivers.manage` can read driver documents for their branch. Restrict that permission and `drivers.verify` to trusted employees.
- File signatures and size are checked, but real production file storage should also include malware scanning, encryption at rest, retention/deletion policy and audit review before collecting real staff documents.
- User's `mustChangePassword` is stored in `users.must_change_password` and is enforced at the backend, not just by React routing.

## Validation performed

- Node `--check` for every backend JS file.
- React JSX/JS parser check using TypeScript compiler syntax parser.
- Seven existing fare/dispatch boundary unit tests.
- Static checks for local-import paths and legacy module statements.

Live MySQL migration and browser network upload flow were not verified here; run the commands above on your installation and test with non-sensitive sample documents first.
