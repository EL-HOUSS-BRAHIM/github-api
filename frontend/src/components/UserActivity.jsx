import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../styles/UserActivity.module.css';

function UserActivity({ username }) {
  const [activity, setActivity] = useState({
    contributions: 0,
    repositories: 0,
    languages: [],
    currentStreak: 0,
    longestStreak: 0,
    lastUpdate: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getUserActivity(username);
        setActivity({
          contributions: response.data.totalContributions || 0,
          repositories: response.data.totalRepositories || 0,
          languages: response.data.languages || [],
          currentStreak: response.data.currentStreak || 0,
          longestStreak: response.data.longestStreak || 0,
          lastUpdate: response.data.lastUpdate,
        });
      } catch (err) {
        setError(err.message || 'Failed to load user activity.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [username]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const timeAgo = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    return timeAgo === 0 ? 'Today' : `${timeAgo} days ago`;
  };

  if (loading) {
    return <div className={styles.loading_message} aria-live="polite">Loading activity...</div>;
  }

  if (error) {
    return <div className={styles.error_message} role="alert">Error: {error}</div>;
  }

  return (
      <div>
        <div>
          <h2>GitHub Status</h2>
          <div>
            <i className="far fa-clock" aria-hidden="true"></i>
            <span>Last Update: {formatDate(activity.lastUpdate)}</span>
          </div>
          <div className={styles.status_grid}>
            <div className={styles.status_item}>
              <span>{activity.contributions.toLocaleString()}</span>
              <span>Contributions</span>
            </div>
            <div className={styles.status_item}>
              <span>{activity.repositories.toLocaleString()}</span>
              <span>Repositories</span>
            </div>
          </div>
        </div>
  
        <div>
          <h2>Most Used Languages</h2>
          <div className={styles.language_list}>
            {activity.languages.map((lang) => (
              <div key={lang.name} className={styles.language_item}>
                <span 
                  className={styles.lang_color} 
                  style={{ background: lang.color }}
                  aria-hidden="true"
                ></span>
                <span>{lang.name}</span>
                <span>{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
  
        <div>
          <h2>Contribution Streak</h2>
          <div className={styles.streak_info}>
            <div>
              <span>{activity.currentStreak}</span>
              <span>Current Streak</span>
            </div>
            <div>
              <span>{activity.longestStreak}</span>
              <span>Longest Streak</span>
            </div>
          </div>
        </div>
  
        <div>
          <h2>Contribution Graph</h2>
          <div className={styles.contribution_graph}>

            {!imageError ? (
              <img 
                src={`https://ghchart.rshah.org/${username}`}
                alt={`${username}'s GitHub contribution graph`}
                onError={() => setImageError(true)}
              />
            ) : (
              <p className={styles.error_message}>Failed to load contribution graph</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  export default UserActivity;