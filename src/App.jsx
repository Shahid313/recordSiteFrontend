import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { PrivateRoute } from './components/PrivateRoute';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { TourViewerPage } from './pages/TourViewerPage';
import { AdminPanel } from './components/AdminPanel';
import { AppShell } from './components/layout/AppShell';
import { Account } from './components/Account';
import { ChangePassword } from './components/ChangePassword';
import { LandingPage } from './pages/LandingPage';
import './App.css';

function ProtectedLayout({ children, title }) {
  return (
    <PrivateRoute>
      <AppShell title={title}>{children}</AppShell>
    </PrivateRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout title="Dashboard">
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedLayout title="Projects">
                <ProjectList />
              </ProtectedLayout>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedLayout title="Project">
                <ProjectDetail />
              </ProtectedLayout>
            }
          />
          <Route
            path="/projects/:id/tour"
            element={
              <ProtectedLayout title="Tour">
                <TourViewerPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedLayout title="Admin">
                <AdminPanel />
              </ProtectedLayout>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedLayout title="My Account">
                <Account />
              </ProtectedLayout>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedLayout title="Change Password">
                <ChangePassword />
              </ProtectedLayout>
            }
          />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;