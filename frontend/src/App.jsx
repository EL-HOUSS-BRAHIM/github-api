import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage';
import UserProfile from './components/UserProfile';
import Navbar from './components/Navbar';
import styles from './styles/global.module.css';

function App() {
  return (
    <div className={styles.container}>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/user/:username" element={<UserProfile />} />
      </Routes>
    </div>
  );
}

export default App;