import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterComplaintPage from "./pages/RegisterComplaintPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import TrackComplaintPage from "./pages/TrackComplaintPage";
import DashboardLayout from "./components/DashboardLayout";
import AdminLoginPage     from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/register" element={<RegisterComplaintPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/track" element={<TrackComplaintPage />} />
        <Route path="/admin"           element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;