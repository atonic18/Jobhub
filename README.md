# JobHub - Job Marketplace Mobile Application

JobHub is a modern cross-platform job marketplace application built with React Native (Expo) and a FastAPI backend. It features separate roles for job seekers and employers, real-time-style messaging, and a sleek SaaS-style UI.

## 🚀 Features

### For Job Seekers
- Search and filter jobs by category, location, and type.
- View detailed job descriptions and requirements.
- Apply to jobs with a single tap.
- Track application status.
- Real-time-style chat with recruiters.

### For Employers
- Dashboard with analytics overview.
- Post, edit, and manage job listings.
- View and manage applicants for each job.
- Subscribe to premium plans for more features.

### For Admins
- Lightweight admin panel to manage users and view reports.

## 🛠️ Tech Stack

- **Frontend:** React Native, Expo SDK 54, NativeWind (Tailwind CSS), Expo Router.
- **Backend:** Python FastAPI, SQLAlchemy, SQLite.
- **Authentication:** JWT (JSON Web Tokens) with persistent storage.
- **State Management:** Context API.
- **API Integration:** Axios.

## 📂 Project Structure

```
/app                # Expo Router screens
/components         # Reusable UI components
/context            # Global state management
/services           # API integration layer
/backend            # FastAPI backend source code
/constants          # Theme and app constants
```

## 🏁 Getting Started

### Backend Setup
1. Navigate to the `backend` folder.
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server: `uvicorn main:app --reload`

### Frontend Setup
1. Install dependencies: `npm install`
2. Update the `API_URL` in `services/api.js` to your local IP address.
3. Start Expo: `npx expo start`
4. Open on Android/iOS via Expo Go.

## 📝 License
This project is for educational purposes (Bachelor's Degree Final Year Project).
