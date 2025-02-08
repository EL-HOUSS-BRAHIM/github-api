import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (username) {
      navigate(`/user/${username}`);
    }
  };

  return (
    <div className="home-container">
      <header>
        <h1><i className="fab fa-github"></i> GitHub Profile Analyzer</h1>
        <p>Analyze GitHub profiles and discover insights about any developer</p>
      </header>
      
      <div className="search-container">
        <form onSubmit={handleSearch}>
          <input 
            type="text" 
            id="username"
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter GitHub username" 
          />
          <button type="submit" id="analyze-button">
            <i className="fas fa-search"></i> Analyze
          </button>
        </form>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <i className="fas fa-chart-line"></i>
          <h3>Activity Analysis</h3>
          <p>Track contribution patterns and activity trends</p>
        </div>
        <div className="feature-card">
          <i className="fas fa-trophy"></i>
          <h3>Rankings</h3>
          <p>Compare developers and see global rankings</p>
        </div>
        <div className="feature-card">
          <i className="fas fa-code-branch"></i>
          <h3>Repository Insights</h3>
          <p>Deep dive into repository statistics</p>
        </div>
      </div>
    </div>
  );
}

export default Home;