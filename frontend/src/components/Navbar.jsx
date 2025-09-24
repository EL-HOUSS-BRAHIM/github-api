import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from '../styles/Navbar.module.css';

function Navbar() {
  const navLinkClass = ({ isActive }) => [
    styles.nav_link,
    isActive ? styles.nav_link_active : ''
  ].filter(Boolean).join(' ');

  return (
    <header className={styles.header}>
      <nav className={styles.nav_container}>
        <div className={styles.logo}>
          <Link to="/">
            <i className="fab fa-github"></i>
            <span>GitHub Report</span>
          </Link>
        </div>
        <div className={styles.nav_links}>
          <NavLink to="/" end className={navLinkClass}>Home</NavLink>
          <NavLink to="/about" className={navLinkClass}>About</NavLink>
          <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;