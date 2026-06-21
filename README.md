# JobHub

JobHub is a cross-platform job marketplace mobile app built with Expo, React Native, Expo Router, NativeWind, and Appwrite. The app supports separate employee, employer, and admin experiences with job posting, applications, saved jobs, private document sharing, messaging, notifications, and Appwrite Functions for workflow automation.

## Current Status

- Expo SDK 54 mobile app with Android, iOS, and web entry points.
- Appwrite is the active backend for auth, database documents, storage, functions, and notifications.
- Employers can create, edit, close, reopen, delete, and manage job postings.
- Employees can search jobs, save jobs, apply with selected documents, and track application status.
- Application workflows include applicant counts, accepted counts, auto-accept rules, interview details, and acceptance messages.
- Production build configuration is available through `eas.json` and `create-production-build.yml`.

## Features

### Employees

- Register and sign in with Appwrite auth.
- Search and filter active jobs.
- View job details, salary, work mode, required skills, and required documents.
- Save and unsave jobs.
- Apply once per job with a cover letter and selected uploaded documents.
- Track application status, including pending, accepted, rejected, needs review, and interview scheduled.
- View acceptance messages, attachments, and interview instructions after acceptance.

### Employers

- Employer dashboard with active posting and applicant stats.
- Post new jobs with title, location, salary, work mode, job type, description, requirements, required skills, and required documents.
- Edit existing job posts without deleting or recreating them.
- Close or reopen postings while preserving applications.
- Delete postings when needed.
- Review applicants for each job.
- Accept or decline applications.
- Configure automatic acceptance criteria, interview details, acceptance messages, and attachments.
- Chat with applicants.

### Admin

- Lightweight admin dashboard area for administrative workflows.

### Backend Automation

- Appwrite Functions process job-post notifications, application submissions, application status changes, messages, daily job digests, document processing, premium purchase flow, and expired job cleanup.
- Appwrite migrations create and update collections, attributes, indexes, buckets, and FAQ data.

## Tech Stack

- Frontend: Expo, React Native, React 19, Expo Router
- Styling: NativeWind, Tailwind CSS
- Backend: Appwrite Cloud
- Appwrite SDKs: `react-native-appwrite`, `node-appwrite`
- Storage: Appwrite Storage for profile images, documents, and message attachments
- Functions: Appwrite Functions written in JavaScript
- Icons: `lucide-react-native`
- Build: EAS Build

The `backend/` FastAPI project still exists in the repository, but the current app workflow is Appwrite-based.

## Project Structure

```text
app/                    Expo Router screens
app/(auth)/             Login and registration screens
app/(home)/             Employee job browsing, saved jobs, applications, profile, notifications
app/(employer)/         Employer dashboard, job posting, job editing, applicants, profile, subscription
app/(admin)/            Admin dashboard
appwrite/               Appwrite setup, migrations, functions, deployment scripts
components/             Reusable UI and card components
context/                Auth context and shared state
services/               Appwrite service layer
utils/                  Job, profile, document, and formatting helpers
assets/                 App icons and splash assets
backend/                Legacy FastAPI backend code
```

## Requirements

- Node.js
- npm
- Expo CLI through `npx expo`
- EAS CLI for cloud builds
- Appwrite project access
- Appwrite API key for setup, migrations, and function deployment scripts

## App Configuration

The app is configured in `app.json`:

- App name: `JobHub`
- Slug: `jobhub`
- Scheme: `jobhub`
- iOS bundle identifier: `com.jobhub.app`
- Android package: `com.jobhub.app`
- Appwrite endpoint: `https://sfo.cloud.appwrite.io/v1`
- Appwrite project ID: `1212125`

The Appwrite mobile platforms must match `com.jobhub.app`.

## Getting Started

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

## Appwrite Setup

Set an Appwrite API key before running setup or migration scripts.

PowerShell example:

```powershell
$env:APPWRITE_API_KEY="your_api_key_here"
```

Run the main setup:

```bash
node appwrite/setup.js
```

Run current migrations:

```bash
npm run appwrite:migrate:fixes
npm run appwrite:migrate:application-upgrade
```

Deploy Appwrite Functions:

```bash
npm run appwrite:deploy:functions
```

Focused deployment scripts are also available:

```bash
npm run appwrite:deploy:router
npm run appwrite:deploy:application-status
npm run appwrite:deploy:notifications
npm run appwrite:deploy:document-processing
```

## Production Builds

EAS build profiles are defined in `eas.json`:

- `development`: internal development client
- `preview`: internal preview build
- `production`: production build with remote app version auto-increment

Run a production Android build:

```bash
npx eas build --profile production --platform android
```

Run a production iOS build:

```bash
npx eas build --profile production --platform ios
```

Build both platforms:

```bash
npx eas build --profile production --platform all
```

The repository also includes `create-production-build.yml`, which defines production build jobs for Android and iOS:

```yaml
name: Create Production Builds

jobs:
  build_android:
    type: build
    params:
      platform: android
  build_ios:
    type: build
    params:
      platform: ios
```

## Important Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run appwrite:migrate:fixes
npm run appwrite:migrate:application-upgrade
npm run appwrite:deploy:functions
```

## Recent Work

- Added employer job editing so posted jobs can be updated directly.
- Reused the existing post-job form for both create and edit flows.
- Preserved applicant counts, accepted counts, close/reopen status, and applications during edits.
- Synced edited acceptance messages and attachments with the automatic message workflow.
- Updated Appwrite migration coverage for edit-related job fields.
- Added production build workflow documentation for Android and iOS builds.

## License

This project is for educational purposes.
