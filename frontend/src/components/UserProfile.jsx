import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import UserProfileCard from './UserProfileCard';
import RepoList from './RepoList';
import UserActivity from './UserActivity';
import UserRanking from './UserRanking';
import styles from '../styles/UserProfile.module.css';

function UserProfile() {
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getUserProfile(username);
        setUserProfile(response.data);
        if (response.data.is_refreshing) {
          setRefreshMessage("Profile data is refreshing in the background...");
        }
      } catch (err) {
        setError(err.message || 'Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage("Refreshing user profile...");
    try {
      await api.refreshUserInfo(username);
      setRefreshMessage("Refresh job queued successfully. Please refresh the page after a moment.");
    } catch (err) {
      setError(err.message || 'Failed to refresh user profile.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.loading_message}>Loading user profile...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.error_message}>Error: {error}</p></div>;
  }

  if (!userProfile) {
    return <div className={styles.container}><p>Could not load user profile.</p></div>;
  }

  return (
    <div className={styles.report_content} id="reportContent">
    <div className={styles.container}>
      <UserProfileCard user={userProfile} />
      {refreshMessage && <p className={styles.loading_message}>{refreshMessage}</p>}
      <button onClick={handleRefresh} disabled={isRefreshing} className={styles.refresh_button}>
        {isRefreshing ? 'Refreshing...' : 'Refresh Profile'}
      </button>
      <main>
      <h2>Activity</h2>
      <UserActivity username={username} />
      <h2>Ranking</h2>
      <UserRanking username={username} />
      <h2>Repositories</h2>
      <RepoList username={username} />
      </main> 
    </div>
    </div>
  );
}

export default UserProfile;