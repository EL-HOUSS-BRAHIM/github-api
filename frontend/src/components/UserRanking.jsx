import React from 'react';
import styles from '../styles/UserRanking.module.css';

function UserRanking() {
  return (
    <div className={styles.github_profile_ranking}>
      <h2>Ranking on the same location:</h2>
      <div className={styles.repo_detail_item}>
        <i className="fas fa-clock"></i>
        Last Update: 2 days ago
      </div>
      <div className={styles.github_profile_commit_rank}>
        <h2>Commit Ranking</h2>
        <div className={styles.rank_info}>
          <span className={styles.rank}>#125</span>
          <span className={styles.label}>Global Rank</span>
        </div>
      </div>
      <div className={styles.github_profile_contribution_rank}>
        <h2>Contribution Ranking</h2>
        <div className={styles.rank_info}>
          <span className={styles.rank}>Top 1%</span>
          <span className={styles.label}>of contributors</span>
        </div>
      </div>
    </div>
  );
}

export default UserRanking;