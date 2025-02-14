import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage';
import UserProfile from './components/UserProfile';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/user/:username" element={<UserProfile />} />
      </Routes>
      <Footer />
      </>
  );
}

export default App;