import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import UserProfileCard from './UserProfileCard';
import RepoList from './RepoList';
import UserActivity from './UserActivity';
import UserRanking from './UserRanking';
import styles from '../styles/UserProfile.module.css';
import { DEFAULT_QUEUE_METRICS, normalizeQueueMetrics } from '../utils/metrics';

function UserProfile() {
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('Load the latest GitHub data whenever you need it.');
  const [refreshMetrics, setRefreshMetrics] = useState(() => ({ ...DEFAULT_QUEUE_METRICS }));

  const buildStatusMessage = useCallback((data, responseStatus) => {
    if (!data) {
      return 'Load the latest GitHub data whenever you need it.';
    }

    if (data.status === 'pending' || responseStatus === 202) {
      return data.message || 'We are preparing this profile. Check back shortly.';
    }

    if (data.is_refreshing) {
      return 'Profile data is refreshing in the background...';
    }

    if (data.is_fresh) {
      return 'Profile data was updated recently.';
    }

    return 'Profile data may be out of date. Refresh to grab the latest stats.';
  }, []);

  const fetchUserProfile = useCallback(async ({ silent = false } = {}) => {
    if (!username) {
      return null;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await api.getUserProfile(username);
      setUserProfile(response.data);
      setIsRefreshing(Boolean(response.data.is_refreshing));
      setRefreshMessage(buildStatusMessage(response.data, response.status));
      setRefreshMetrics(normalizeQueueMetrics(response.data.refresh_metrics));
      return response.data;
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Failed to load user profile.');
      }
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [username, buildStatusMessage]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (!username) {
      return undefined;
    }

    const shouldPoll = Boolean(
      userProfile?.is_refreshing ||
      (refreshMetrics.active ?? 0) > 0 ||
      (refreshMetrics.queued ?? 0) > 0
    );

    if (!shouldPoll) {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchUserProfile({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [username, userProfile?.is_refreshing, refreshMetrics.active, refreshMetrics.queued, fetchUserProfile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage('Refreshing user profile...');
    try {
      const response = await api.refreshUserInfo(username);
      setRefreshMessage(response.data?.message || 'Refresh job queued successfully. We will update the dashboard as soon as the harvest completes.');
      const metrics = normalizeQueueMetrics(response.data?.refresh_metrics);
      setRefreshMetrics(metrics);
      setUserProfile((prev) => {
        if (!prev) {
          return prev;
        }

        if (prev.status === 'pending') {
          return { ...prev, refresh_metrics: metrics, refresh_queued: true };
        }

        return { ...prev, is_refreshing: true, refresh_metrics: metrics, refresh_queued: true };
      });
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to refresh user profile.';
      setRefreshMessage(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isPending = userProfile?.status === 'pending';
  const lastUpdatedLabel = userProfile?.last_fetched
    ? new Date(userProfile.last_fetched).toLocaleString()
    : 'Not available';

  if (loading) {
    return <div className={styles.container}><p className={styles.loading_message}>Loading user profile...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.error_message}>Error: {error}</p></div>;
  }

  if (isPending && userProfile) {
    return (
      <div className={styles.container}>
        <div className={styles.pending_state}>
          <h2 className={styles.pending_title}>We&apos;re fetching {username}&apos;s profile</h2>
          <p className={styles.pending_message}>{refreshMessage}</p>
          {userProfile.retryAfter ? (
            <p className={styles.pending_hint}>
              This usually takes about {userProfile.retryAfter} seconds. We&apos;ll keep this page updated automatically.
            </p>
          ) : null}
          <div className={styles.status_metrics} aria-live="polite">
            <span className={styles.metrics_heading}>Refresh queue</span>
            <div className={styles.metrics_grid}>
              <div className={styles.metric_item}>
                <span className={styles.metric_value}>{refreshMetrics.active}</span>
                <span className={styles.metric_label}>Active</span>
              </div>
              <div className={styles.metric_item}>
                <span className={styles.metric_value}>{refreshMetrics.queued}</span>
                <span className={styles.metric_label}>Queued</span>
              </div>
              <div className={styles.metric_item}>
                <span className={styles.metric_value}>{refreshMetrics.delayed}</span>
                <span className={styles.metric_label}>Delayed</span>
              </div>
              <div className={styles.metric_item}>
                <span className={styles.metric_value}>{refreshMetrics.completed}</span>
                <span className={styles.metric_label}>Completed</span>
              </div>
              <div className={styles.metric_item}>
                <span className={styles.metric_value}>{refreshMetrics.failed}</span>
                <span className={styles.metric_label}>Failed</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.status_button}
            onClick={() => fetchUserProfile({ silent: true })}
            disabled={loading}
          >
            Check status now
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <div className={styles.container}><p>Could not load user profile.</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.report_content} id="reportContent">
        <UserProfileCard user={userProfile} />

        <main>
          <div className={styles.status_panel}>
            <div className={styles.status_text}>
              <p className={styles.status_message}>{refreshMessage}</p>
              <p className={styles.status_meta}>Last updated: {lastUpdatedLabel}</p>
              {userProfile.is_refreshing && (
                <p className={styles.status_hint}>
                  We&apos;re syncing the latest activity. Refresh this page in a few seconds to see the update.
                </p>
              )}
              {(refreshMetrics.active > 0 || refreshMetrics.queued > 0) && (
                <p className={styles.status_hint}>
                  Queue status: {refreshMetrics.active} active • {refreshMetrics.queued} waiting • {refreshMetrics.completed} completed.
                </p>
              )}
              <div className={styles.status_metrics} aria-live="polite">
                <span className={styles.metrics_heading}>Refresh queue</span>
                <div className={styles.metrics_grid}>
                  <div className={styles.metric_item}>
                    <span className={styles.metric_value}>{refreshMetrics.active}</span>
                    <span className={styles.metric_label}>Active</span>
                  </div>
                  <div className={styles.metric_item}>
                    <span className={styles.metric_value}>{refreshMetrics.queued}</span>
                    <span className={styles.metric_label}>Queued</span>
                  </div>
                  <div className={styles.metric_item}>
                    <span className={styles.metric_value}>{refreshMetrics.delayed}</span>
                    <span className={styles.metric_label}>Delayed</span>
                  </div>
                  <div className={styles.metric_item}>
                    <span className={styles.metric_value}>{refreshMetrics.completed}</span>
                    <span className={styles.metric_label}>Completed</span>
                  </div>
                  <div className={styles.metric_item}>
                    <span className={styles.metric_value}>{refreshMetrics.failed}</span>
                    <span className={styles.metric_label}>Failed</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={styles.status_button}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Queuing refresh…' : 'Refresh profile'}
            </button>
          </div>
          <div className={styles.github_profile_status}>
          <UserActivity username={username} />
          </div>
          <UserRanking username={username} />
          <RepoList username={username} />
        </main>
      </div>
    </div>
  );
}

export default UserProfile;