import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import Roles from './pages/Roles.jsx';
import Groups from './pages/Groups.jsx';
import Mikrotiks from './pages/Mikrotiks.jsx';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="roles" element={<Roles />} />
        <Route path="groups" element={<Groups />} />
        <Route path="mikrotiks" element={<Mikrotiks />} />
      </Route>
    </Routes>
  );
};

export default App;
