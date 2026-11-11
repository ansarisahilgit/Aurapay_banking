# Banking Management System (Simulation)

Educational MERN banking simulator. It does **not** connect to banks or transfer real money.

## Stack
- React + Vite
- Node.js + Express
- MongoDB Atlas + Mongoose
- JWT authentication and bcrypt password hashing

## Local setup on macOS / Windows (without Docker)

### Prerequisites
- Node.js 22 LTS (use the macOS Intel x64 installer on Intel Macs)
- npm
- MongoDB Atlas database

### 1. Configure MongoDB Atlas
Create a cluster, create a database user, and add your current IP address under Network Access. Copy the Node.js connection string from Connect > Drivers. Atlas clusters are replica sets, which supports the MongoDB transactions used for transfers.

### 2. Configure backend
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env` and replace the `MONGO_URI` value with your Atlas connection string. Set a long random `JWT_SECRET`. Keep `OTP_DEMO_MODE=true` only for local demonstration.

Install and run:
```bash
npm install
npm run dev
```
Backend runs at http://localhost:5000. Health check: http://localhost:5000/api/health

### 3. Configure frontend
Open a second terminal from the project root:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` requests to the backend on port 5000.

### Demo users
- `alice@demo.local` / `DemoPass123!`
- `bob@demo.local` / `DemoPass123!`

The backend seeds these accounts only when the database has no users. Each starts with virtual funds.

## Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

Before deployment, set the production API URL in the frontend configuration, configure environment variables, restrict CORS, and turn off demo OTP mode. Do not deploy the demo OTP response as a real authentication mechanism.

## Project structure
- `backend/` Express API, models, middleware, routes and seed utility
- `frontend/` React application
- `docker-compose.yml` optional Docker deployment files (not required for local setup)

## Important
This is an educational simulation, not production banking software. No bank integrations, real money, UPI, KYC, payment gateway or real OTP delivery provider is included. A professional security review and additional controls are required before any real-world financial use.
