import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import styles from '../styles/UserRanking.module.css';

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
}

function UserRanking({ username }) {
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRanking = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getUserRanking(username);
      setRanking(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load ranking.');
      setRanking(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  const handleRecalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.calculateUserRanking(username);
      await fetchRanking();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to recalculate ranking.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return (
    <div className={styles.github_profile_ranking}>
      <div className={styles.ranking_header}>
        <h2>Ranking</h2>
        <button
          type="button"
          className={styles.refresh_button}
          onClick={handleRecalculate}
          disabled={loading}
        >
          <i className="fas fa-sync"></i> Refresh ranking
        </button>
      </div>

      {loading && <p className={styles.loading_message}>Loading ranking...</p>}
      {error && !loading && <p className={styles.error_message}>Error: {error}</p>}

      {!loading && !error && ranking && (
        <>
          <div className={styles.repo_detail_item}>
            <i className="fas fa-clock"></i>
            Last update: {formatDate(ranking.lastCalculated)}
          </div>

          <div className={styles.rank_summary}>
            <div className={styles.rank_info}>
              <span className={styles.rank}>#{ranking.globalRank ?? '—'}</span>
              <span className={styles.label}>Global Rank</span>
            </div>
            <div className={styles.rank_info}>
              <span className={styles.rank}>#{ranking.countryRank ?? '—'}</span>
              <span className={styles.label}>{ranking.country || 'No country detected'}</span>
            </div>
          </div>

          <div className={styles.ranking_metrics}>
            <div className={styles.metric_card}>
              <span className={styles.metric_label}>Score</span>
              <span className={styles.metric_value}>{ranking.score ?? 0}</span>
            </div>
            <div className={styles.metric_card}>
              <span className={styles.metric_label}>Followers</span>
              <span className={styles.metric_value}>{ranking.followers ?? 0}</span>
            </div>
            <div className={styles.metric_card}>
              <span className={styles.metric_label}>Public repos</span>
              <span className={styles.metric_value}>{ranking.publicRepos ?? 0}</span>
            </div>
            <div className={styles.metric_card}>
              <span className={styles.metric_label}>Total commits</span>
              <span className={styles.metric_value}>{ranking.totalCommits ?? 0}</span>
            </div>
            <div className={styles.metric_card}>
              <span className={styles.metric_label}>Total contributions</span>
              <span className={styles.metric_value}>{ranking.totalContributions ?? 0}</span>
            </div>
          </div>
        </>
      )}

      {!loading && !error && !ranking && (
        <div className={styles.empty_state}>
          <p>No ranking data yet. Trigger a refresh to calculate it.</p>
          <button
            type="button"
            className={styles.refresh_button}
            onClick={handleRecalculate}
            disabled={loading}
          >
            <i className="fas fa-chart-line"></i> Calculate ranking
          </button>
        </div>
      )}
    </div>
  );
}

export default UserRanking;