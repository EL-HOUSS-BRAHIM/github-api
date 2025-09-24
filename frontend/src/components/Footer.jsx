import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Footer.module.css';

function Footer() {
    return (
        <footer className={styles.footer}>
        <div className={styles.footer_content}>
          <div className={styles.footer_section}>
            <h3>GitHub Report</h3>
            <p>Generate comprehensive reports for GitHub profiles</p>
          </div>
          <div className={styles.footer_section}>
            <h3>Links</h3>
            <ul>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><a href="https://docs.github.com/en/rest" target="_blank" rel="noopener noreferrer">GitHub API</a></li>
            </ul>
          </div>
          <div className={styles.footer_section}>
            <h3>Connect</h3>
            <div className={styles.social_links}>
              <a href="#"><i className="fab fa-github"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>
        </div>
        <div className={styles.footer_bottom}>
          <p>&copy; 2024 GitHub Report. All rights reserved.</p>
        </div>
      </footer>
    );
}

export default Footer;