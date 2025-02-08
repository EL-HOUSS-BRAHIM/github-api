/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import UserCard from './components/UserCard';
import Rankings from './pages/Rankings';
import Reports from './pages/Reports';

function App() {
  return (
    <div className="app">
      <canvas id="canvas-bg"></canvas>
      <Router>
        <Header />
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/user/:username" element={<UserCard />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </div>
        <Footer />
      </Router>
    </div>
  );
}

export default App;