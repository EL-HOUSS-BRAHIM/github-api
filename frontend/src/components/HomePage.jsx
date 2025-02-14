import React from 'react';
import SearchBar from './SearchBar';
import styles from '../styles/SearchBar.module.css';

function HomePage() {
  return (
    <div className={styles.container}>
    <section className={styles.search_section} id="searchSection">
      <div className={styles.search_container}>
        <h1>GitHub Profile Report</h1>
        <p>Enter a GitHub username to generate a detailed report</p>
        <SearchBar />
      </div>
    </section>
    </div>
  );
}

export default HomePage;