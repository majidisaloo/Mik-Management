# Mik Management

A full-stack registration experience built with React, Vite, Express, and SQLite. The project ships with a modern onboarding guide, a secure API, and a polished user interface.

## Project Structure

```
Mik-Management/
├── backend/   # Express + SQLite API
└── frontend/  # Vite + React single-page application
```

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://example.com/mik-management.git
   cd mik-management
   ```
2. Install dependencies for the API:
   ```bash
   cd backend
   npm install
   ```
3. Run the API server (http://localhost:4000):
   ```bash
   npm run dev
   ```
4. In a separate terminal, install the web client dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
5. Launch the development server (http://localhost:5173):
   ```bash
   npm run dev
   ```
6. Visit the site at http://localhost:5173 and use the **Register** link to create an account.

## Environment Variables

The default configuration works without custom variables. For production deployments you can override the port with `PORT=5000 npm run dev` in the backend.

## Database

The backend uses SQLite and automatically creates the database file at `backend/data/app.db`. Passwords are hashed with bcrypt before being persisted.

## Useful npm Scripts

| Location | Script | Description |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API server. |
| `frontend` | `npm run dev` | Start the Vite development server. |
| `frontend` | `npm run build` | Build the production assets. |
| `frontend` | `npm run preview` | Preview the production build locally. |

## Quick Git Reference

- Check your working tree: `git status`
- Create a feature branch: `git checkout -b feature/your-feature`
- Stage files: `git add .`
- Commit changes: `git commit -m "Describe your change"`
- Push to origin: `git push origin feature/your-feature`

## API Overview

`POST /api/register`

- **Body**: `{ firstName, lastName, email, password, passwordConfirmation }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing fields, mismatched passwords, or weak password
  - `409`: Email already registered
  - `500`: Unexpected server error

## License

This project is distributed for demonstration purposes and does not yet include an explicit license.
