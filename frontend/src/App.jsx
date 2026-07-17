import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Styleguide from './pages/Styleguide';
import './theme.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Navigate to="/history" replace />} />
        <Route path="/upload"        element={<Upload />} />
        <Route path="/flights/:id"   element={<Dashboard />} />
        <Route path="/history"       element={<History />} />
        <Route path="/styleguide"    element={<Styleguide />} />
      </Routes>
    </BrowserRouter>
  );
}
