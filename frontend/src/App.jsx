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
import RoutesPage from './pages/Routes.jsx';
import Firewall from './pages/Firewall.jsx';
import IPAM from './pages/IPAM.jsx';
import IPAMDetails from './pages/IPAMDetails.jsx';
import QueueLogs from './pages/QueueLogs.jsx';
import Settings from './pages/Settings.jsx';
import { UpdateProvider } from './context/UpdateContext.jsx';

const managementRoutes = [
  { path: 'dashboard', Component: Dashboard },
  { path: 'users', Component: UsersAndRoles },
  { path: 'roles', Component: UsersAndRoles },
  { path: 'groups', Component: Groups },
  { path: 'mikrotiks', Component: Mikrotiks },
  { path: 'mikrotiks/:id', Component: DeviceDetails },
  { path: 'mikrotiks/:id/logs', Component: DeviceDetails },
  { path: 'mikrotiks/:id/interfaces', Component: DeviceDetails },
  { path: 'mikrotiks/:id/ip-addresses', Component: DeviceDetails },
  { path: 'mikrotiks/:id/routes', Component: DeviceDetails },
  { path: 'mikrotiks/:id/firewall', Component: DeviceDetails },
  { path: 'mikrotiks/:id/nat', Component: DeviceDetails },
  { path: 'mikrotiks/:id/mangle', Component: DeviceDetails },
  { path: 'mikrotiks/:id/update', Component: DeviceDetails },
  { path: 'tunnels', Component: Tunnels },
  { path: 'routes', Component: RoutesPage },
  { path: 'firewall', Component: Firewall },
  { path: 'ipam', Component: IPAM },
  { path: 'ipam/:id', Component: IPAMDetails },
  { path: 'ipam/:id/sections/:sectionId', Component: IPAMDetails },
  { path: 'ipam/:id/sections/:sectionId/ranges/:rangeId', Component: IPAMDetails },
  { path: 'ipams', Component: IPAM },
  { path: 'ipams/:id', Component: IPAMDetails },
  { path: 'ipams/:id/sections/:sectionId', Component: IPAMDetails },
  { path: 'ipams/:id/sections/:sectionId/ranges/:rangeId', Component: IPAMDetails },
  { path: 'ipams/:id/queue-logs', Component: QueueLogs },
  { path: 'ipam/:id/queue-logs', Component: QueueLogs },
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
    <UpdateProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="login" element={<Login />} />
          {managementRoutes.flatMap((route) => buildRouteVariants(route))}
        </Route>
      </Routes>
    </UpdateProvider>
  );
};

export default App;
