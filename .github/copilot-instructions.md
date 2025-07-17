# Copilot Instructions for AI Agents

## Project Overview
This is a full-stack food menu and order management system (OrderEase) using the MERN stack. The codebase is organized into three main folders:
- `backend/` (Node.js/Express, MongoDB)
- `admin/` (React, Argon Dashboard, Reactstrap)
- `frontend/customer/` (React, Vite)

## Architecture & Data Flow
- **Backend**: REST API using Express, with endpoints for users, authentication (OTP/email), orders, and menu management. MongoDB is used for persistence. Key entry: `backend/src/index.js`.
- **Admin**: React dashboard for staff/admins, using Argon Dashboard React. Auth, context, and API calls are managed via React Context and `axios`. See `admin/src/context/` and `admin/src/components/`.
- **Customer Frontend**: Customer-facing React app (Vite). Communicates with backend via REST API.
- **Communication**: All frontends use `axios` to call backend endpoints. API base URL is set via `REACT_APP_API_URL` env variable (default: `http://localhost:5001`).

## Developer Workflows
- **Start All Servers**: Use the VS Code task "Start All Servers" to launch backend and customer frontend in separate terminals.
- **Admin Panel**: In `admin/`, run `npm start` (uses `react-scripts`).
- **Backend**: In `backend/`, run `npm run dev` (nodemon) or `npm start` (node).
- **Customer Frontend**: In `frontend/customer/`, run `npm run dev` (Vite).
- **Linting**: Run `npm run lint` in `frontend/customer/` for code linting.
- **Testing**: No tests are defined by default. Add tests as needed.

## Project-Specific Patterns
- **Context Usage**: Auth and other global state are managed via React Context (see `admin/src/context/AuthContext.js`).
- **API Calls**: Use `axios` for all HTTP requests. API URLs are constructed using the environment variable or fallback.
- **OTP/Email Verification**: See `DirectOTPModal.js` for the pattern of sending/resending OTPs and verifying codes.
- **Component Structure**: Admin and customer frontends use modular React components, grouped by feature.
- **Proxy/Env**: For local development, ensure API URLs are set correctly in `.env` files or via Vite/React env conventions.

## Integration Points
- **Backend API**: All frontends communicate with backend via REST endpoints (see `backend/API-Documentation.md`).
- **Authentication**: Email/OTP-based, with endpoints `/api/users/resend-otp` and `/api/users/verify-email`.
- **State Sync**: User verification state is stored in localStorage after successful OTP verification.

## Conventions & Tips
- **Do not hardcode API URLs**; always use the env variable pattern.
- **When adding new features**, follow the context/provider pattern for global state.
- **For new API endpoints**, document them in `backend/API-Documentation.md`.
- **UI**: Use Argon Dashboard React components for admin UI consistency.

## Key Files & Directories
- `backend/src/index.js`: Backend entry point
- `admin/src/context/AuthContext.js`: Auth logic for admin
- `admin/src/components/Modals/DirectOTPModal.js`: OTP modal logic
- `frontend/customer/`: Customer-facing React app
- `backend/API-Documentation.md`: Backend API reference

---

For more details, see the respective `README.md` files in each subproject.
