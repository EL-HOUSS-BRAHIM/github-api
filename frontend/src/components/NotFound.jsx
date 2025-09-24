import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/NotFound.module.css';

function NotFound() {
  return (
    <section className={styles.container}>
      <h1>Page not found</h1>
      <p>We couldn&apos;t find the page you were looking for. Double-check the address or return to the search screen.</p>
      <Link to="/" className={styles.home_link}>
        Go to search
      </Link>
    </section>
  );
}

export default NotFound;
