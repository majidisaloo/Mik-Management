# Mik Management

A lightweight Express application that demonstrates a registration form backed by SQLite. The homepage contains setup steps and a short Git primer so teammates can start contributing immediately.

## Prerequisites

- Node.js 18 or newer
- npm (bundled with Node.js)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Open your browser to <http://localhost:3000> to view the site.

## Registration Flow

- Open the **Register** page from the homepage.
- Complete the fields: first name, last name, email, password, and confirm password.
- Submit the form to save the user in the local SQLite database (`data.db`).
- Passwords are hashed with `bcryptjs` before being persisted.

## Database Location

The SQLite database file (`data.db`) is created automatically in the project root the first time the server runs.

## Project Structure

```
├── public
│   └── styles.css
├── views
│   ├── home.ejs
│   └── register.ejs
├── server.js
├── package.json
└── README.md
```

## Available Scripts

- `npm start` – starts the Express server on port 3000.

## License

MIT
