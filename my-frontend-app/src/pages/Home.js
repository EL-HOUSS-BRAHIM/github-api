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
    <div>
      <h2>Search GitHub User</h2>
      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter GitHub username" 
        />
        <button type="submit">Search</button>
      </form>
    </div>
  );
}

export default Home;