import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BuyerDashboard from './pages/BuyerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import Tier2Dashboard from './pages/Tier2Dashboard';
import SimulationPage from './pages/SimulationPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import AddSupplierPage from './pages/AddSupplierPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import SettingsPage from './pages/SettingsPage';
import SupplierApprovalPage from './pages/SupplierApprovalPage';
import EdgeManagerPage from './pages/EdgeManagerPage';
import BulkUploadPage from './pages/BulkUploadPage';
import BackupSupplierPage from './pages/BackupSupplierPage';
import './index.css';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><BuyerDashboard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/approvals" element={<PrivateRoute><SupplierApprovalPage /></PrivateRoute>} />
        <Route path="/supplier" element={<PrivateRoute><SupplierDashboard /></PrivateRoute>} />
        <Route path="/supplier/tier2" element={<PrivateRoute><Tier2Dashboard /></PrivateRoute>} />
        <Route path="/simulation" element={<PrivateRoute><SimulationPage /></PrivateRoute>} />
        <Route path="/recommendations" element={<PrivateRoute><RecommendationsPage /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        <Route path="/alerts" element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
        <Route path="/suppliers/add" element={<PrivateRoute><AddSupplierPage /></PrivateRoute>} />
        <Route path="/suppliers/upload" element={<PrivateRoute><BulkUploadPage /></PrivateRoute>} />
        <Route path="/suppliers/:id" element={<PrivateRoute><SupplierDetailPage /></PrivateRoute>} />
        <Route path="/edges" element={<PrivateRoute><EdgeManagerPage /></PrivateRoute>} />
        <Route path="/backup" element={<PrivateRoute><BackupSupplierPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}
