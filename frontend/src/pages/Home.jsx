const Home = () => {
  return (
    <section className="card">
      <h1>Welcome to Mik Management</h1>
      <p>
        This project provides a fast full-stack starter with a guided onboarding
        experience and a modern registration form connected to a SQLite
        database.
      </p>

      <h2>Installation Guide</h2>
      <ol>
        <li>Install Node.js 18 or newer on your machine.</li>
        <li>Clone the repository: <code>git clone https://example.com/mik-management.git</code>.</li>
        <li>Install dependencies in both folders: <code>cd backend &amp;&amp; npm install</code> and <code>cd frontend &amp;&amp; npm install</code>.</li>
        <li>Start the database-backed API by running <code>npm run dev</code> inside the <code>backend</code> directory.</li>
        <li>Launch the web client with <code>npm run dev</code> inside the <code>frontend</code> directory.</li>
        <li>Open <code>http://localhost:5173</code> in your browser and use the Register link.</li>
      </ol>

      <h2>Quick Git Tips</h2>
      <ul>
        <li>Check your current status with <code>git status</code>.</li>
        <li>Create a new branch for a feature: <code>git checkout -b feature/name</code>.</li>
        <li>Add your changes: <code>git add .</code>.</li>
        <li>Commit with a clear message: <code>git commit -m "Describe your change"</code>.</li>
        <li>Push the branch: <code>git push origin feature/name</code>.</li>
      </ul>
    </section>
  );
};

export default Home;
