import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../styles/UserActivity.module.css';

function UserActivity({ username }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getUserActivity(username);
        setActivity(response.data.activities);
      } catch (err) {
        setError(err.message || 'Failed to load user activity.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [username]);

  if (loading) {
    return <p className={styles.loading_message}>Loading activity...</p>;
  }

  if (error) {
    return <p className={styles.error_message}>Error: {error}</p>;
  }

  if (!activity.length) {
    return <p>No activity found for the last year.</p>;
  }

  return (
    <div className={styles.github_profile_status}>
      <div className={styles.profile_github_status}>
        <h2>GitHub Status</h2>
        <div className={styles.repo_detail_item}>
          <i className="fas fa-clock"></i>
          Last Update: 2 days ago
        </div>
        <div className={styles.status_grid}>
          <div className={styles.status_item}>
            <span className={styles.count}>2.5k</span>
            <span className={styles.label}>Contributions</span>
          </div>
          <div className={styles.status_item}>
            <span className={styles.count}>156</span>
            <span className={styles.label}>Repositories</span>
          </div>
        </div>
      </div>
      
      <div className={styles.profile_github_MU_Languages}>
        <h2>Most Used Languages</h2>
        <div className={styles.language_list}>
          <div className={styles.language_item}>
            <span className={styles.lang_color} style={{ background: '#f1e05a' }}></span>
            <span className={styles.lang_name}>JavaScript</span>
            <span className={styles.lang_percent}>45%</span>
          </div>
          <div className={styles.language_item}>
            <span className={styles.lang_color} style={{ background: '#3572A5' }}></span>
            <span className={styles.lang_name}>Python</span>
            <span className={styles.lang_percent}>30%</span>
          </div>
          <div className={styles.language_item}>
            <span className={styles.lang_color} style={{ background: '#e34c26' }}></span>
            <span className={styles.lang_name}>HTML</span>
            <span className={styles.lang_percent}>25%</span>
          </div>
        </div>
      </div>
      
      <div className={styles.profile_github_streak_and_total_contributions}>
        <h2>Contribution Streak</h2>
        <div className={styles.streak_info}>
          <div className={styles.streak_item}>
            <span className={styles.count}>65</span>
            <span className={styles.label}>Current Streak</span>
          </div>
          <div className={styles.streak_item}>
            <span className={styles.count}>120</span>
            <span className={styles.label}>Longest Streak</span>
          </div>
        </div>
      </div>
      
      <div className={styles.contribution_graph}>
        {/* Will be populated by JavaScript */}
      </div>
    </div>
  );
}

export default UserActivity;