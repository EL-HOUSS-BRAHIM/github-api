import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/SearchBar.module.css';

function SearchBar() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (username.trim()) {
      navigate(`/user/${username}`);
    } else {
      alert('Please enter a username.');
    }
  };

  return (
    <div className={styles.search_box}>
      <input
        type="text"
        id="usernameInput"
        placeholder="Enter GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button id="searchButton" onClick={handleSubmit}>
        <i className="fas fa-search"></i> Generate Report
      </button>
    </div>
  );
}

export default SearchBar;