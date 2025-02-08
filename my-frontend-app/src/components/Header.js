import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <i className="fab fa-github"></i> GitHub Analyzer
        </Link>
        <ul className="nav-menu">
          <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
          <li className="nav-item"><Link to="/rankings" className="nav-link">Rankings</Link></li>
          <li className="nav-item"><Link to="/reports" className="nav-link">Reports</Link></li>
          <li className="nav-item"><Link to="/about" className="nav-link">About</Link></li>
        </ul>
      </div>
    </nav>
  );
}

export default Header;