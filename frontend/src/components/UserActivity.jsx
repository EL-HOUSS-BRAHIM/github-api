import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { calculateActivityMetrics } from '../utils/metrics';
import styles from '../styles/UserActivity.module.css';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatLastActive(value) {
  if (!value) {
    return 'No activity recorded';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No activity recorded';
  }

  const diffDays = Math.floor((Date.now() - parsed.getTime()) / DAY_IN_MS);

  let relative;
  if (diffDays <= 0) {
    relative = 'Today';
  } else if (diffDays === 1) {
    relative = 'Yesterday';
  } else {
    relative = `${diffDays} days ago`;
  }

  const formattedDate = parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return `${relative} • ${formattedDate}`;
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function UserActivity({ username }) {
  const [activity, setActivity] = useState({
    totalContributions: 0,
    totals: { commits: 0, pullRequests: 0, issuesOpened: 0 },
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    daysTracked: 0,
    activeDays: 0,
    averages: { perDay: 0, perActiveDay: 0 },
    dailyActivity: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!username) {
      return;
    }

    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getUserActivity(username);
        setActivity(calculateActivityMetrics(response.data || {}));
        setImageError(false);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load user activity.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [username]);

  const averagePerActiveDay = Math.round(activity.averages.perActiveDay || 0);
  const averagePerDay = Math.round(activity.averages.perDay || 0);
  const recentActivity = activity.dailyActivity.slice(0, 14);

  if (loading) {
    return <div className={styles.loading_message} aria-live="polite">Loading activity...</div>;
  }

  if (error) {
    return <div className={styles.error_message} role="alert">Error: {error}</div>;
  }

  return (
    <div className={styles.activity_container}>
      <section className={styles.section}>
        <div className={styles.section_header}>
          <h2>Contribution overview</h2>
          <span className={styles.section_meta}>Last active: {formatLastActive(activity.lastActivityDate)}</span>
        </div>

        <div className={styles.summary_grid}>
          <div className={styles.summary_card}>
            <span className={styles.summary_label}>Total contributions</span>
            <span className={styles.summary_value}>{activity.totalContributions.toLocaleString()}</span>
          </div>
          <div className={styles.summary_card}>
            <span className={styles.summary_label}>Active days</span>
            <span className={styles.summary_value}>{activity.activeDays.toLocaleString()}</span>
            <span className={styles.summary_helper}>of {activity.daysTracked.toLocaleString()} tracked days</span>
          </div>
          <div className={styles.summary_card}>
            <span className={styles.summary_label}>Current streak</span>
            <span className={styles.summary_value}>{activity.currentStreak}</span>
            <span className={styles.summary_helper}>consecutive days</span>
          </div>
          <div className={styles.summary_card}>
            <span className={styles.summary_label}>Longest streak</span>
            <span className={styles.summary_value}>{activity.longestStreak}</span>
            <span className={styles.summary_helper}>best run</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.section_header}>
          <h3>Contribution breakdown</h3>
        </div>

        <div className={styles.breakdown_grid}>
          <div className={styles.metric_card}>
            <span className={styles.metric_label}>Commits</span>
            <span className={styles.metric_value}>{activity.totals.commits.toLocaleString()}</span>
          </div>
          <div className={styles.metric_card}>
            <span className={styles.metric_label}>Pull requests</span>
            <span className={styles.metric_value}>{activity.totals.pullRequests.toLocaleString()}</span>
          </div>
          <div className={styles.metric_card}>
            <span className={styles.metric_label}>Issues opened</span>
            <span className={styles.metric_value}>{activity.totals.issuesOpened.toLocaleString()}</span>
          </div>
          <div className={styles.metric_card}>
            <span className={styles.metric_label}>Avg per active day</span>
            <span className={styles.metric_value}>{averagePerActiveDay.toLocaleString()}</span>
            <span className={styles.metric_helper}>Avg per tracked day: {averagePerDay.toLocaleString()}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.section_header}>
          <h3>Recent activity</h3>
          <span className={styles.section_meta}>Showing last {recentActivity.length} days</span>
        </div>

        {recentActivity.length === 0 ? (
          <div className={styles.empty_state}>No contribution activity recorded yet.</div>
        ) : (
          <div className={styles.table_wrapper}>
            <table className={styles.activity_table}>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Commits</th>
                  <th scope="col">Pull requests</th>
                  <th scope="col">Issues opened</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((day) => (
                  <tr key={day.date}>
                    <td>{formatDate(day.date)}</td>
                    <td>{day.commits.toLocaleString()}</td>
                    <td>{day.pullRequests.toLocaleString()}</td>
                    <td>{day.issuesOpened.toLocaleString()}</td>
                    <td>{day.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.section_header}>
          <h3>Contribution graph</h3>
        </div>
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
      </section>
    </div>
  );
}

export default UserActivity;
