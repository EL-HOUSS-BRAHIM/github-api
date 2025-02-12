import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Navbar.module.css';

function Navbar() {
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
          <Link to="/" className={styles.nav_link}>Home</Link>
          <Link to="/about" className={styles.nav_link}>About</Link>
          <Link to="/contact" className={styles.nav_link}>Contact</Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;