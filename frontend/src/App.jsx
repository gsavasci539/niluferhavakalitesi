import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Results from './pages/Results.jsx';
import Resources from './pages/Resources.jsx';
import Content from './pages/Content.jsx';
import About from './pages/About.jsx';

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sonuclar" element={<Results />} />
          <Route path="/kaynaklar" element={<Resources />} />
          <Route path="/icerik" element={<Content />} />
          <Route path="/hakkimizda" element={<About />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
