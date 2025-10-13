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
        <li>On Ubuntu, install dependencies: <code>sudo apt update &amp;&amp; sudo apt install nodejs npm rpm -y</code>.</li>
        <li>
          Clone the repository where you want to work:
          <code>git clone https://github.com/majidisaloo/Mik-Management.git</code>.
        </li>
        <li>
          Install backend dependencies: <code>cd backend</code> then
          <code>npm install</code>.
        </li>
        <li>Run the API locally with <code>npm run dev</code> (it listens on port 4000).</li>
        <li>
          In a new terminal, install frontend dependencies:
          <code>cd frontend &amp;&amp; npm install</code>.
        </li>
        <li>Launch the React app with <code>npm run dev</code> and open <code>http://localhost:5173</code>.</li>
      </ol>

      <h2>Deploying Behind Nginx</h2>
      <p>
        Build the frontend with <code>npm run build</code>, run the API with a process manager such as PM2, and
        configure Nginx to serve <code>frontend/dist</code> at the root domain while proxying
        <code>/api</code> to <code>http://127.0.0.1:4000</code>.
      </p>

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
