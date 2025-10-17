import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UsersAndRoles from './pages/UsersAndRoles.jsx';
import Groups from './pages/Groups.jsx';
import Mikrotiks from './pages/Mikrotiks.jsx';
import DeviceDetails from './pages/DeviceDetails.jsx';
import Tunnels from './pages/Tunnels.jsx';
import IPAM from './pages/IPAM.jsx';
import Settings from './pages/Settings.jsx';

const managementRoutes = [
  { path: 'dashboard', Component: Dashboard },
  { path: 'users', Component: UsersAndRoles },
  { path: 'roles', Component: UsersAndRoles },
  { path: 'groups', Component: Groups },
  { path: 'mikrotiks', Component: Mikrotiks },
  { path: 'mikrotiks/:id', Component: DeviceDetails },
  { path: 'tunnels', Component: Tunnels },
  { path: 'ipam', Component: IPAM },
  { path: 'settings', Component: Settings }
];

const buildRouteVariants = ({ path, Component }) => {
  const capitalizedPath = path.charAt(0).toUpperCase() + path.slice(1);
  return [
    <Route key={path} path={path} element={<Component />} />,
    <Route key={`${path}-alias`} path={capitalizedPath} element={<Component />} />
  ];
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        {managementRoutes.flatMap((route) => buildRouteVariants(route))}
      </Route>
    </Routes>
  );
};

export default App;
