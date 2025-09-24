import React from 'react';
import styles from '../styles/UserProfileCard.module.css';

function UserProfileCard({ user }) {
  const social = user?.social || {};
  const hasSocialLinks = Object.keys(social).length > 0 || Boolean(user?.website);

  return (
    <aside className={styles.github_profile}>
      <div className={styles.profile_avatar}>
        <img src={user.avatar_url} alt={`${user.full_name || user.username}'s avatar`} loading="lazy" />
      </div>
      <div className={styles.profile_username}>
        <h1>{user.full_name || user.username}</h1>
        <span className={styles.username}>@{user.username}</span>
      </div>
      {user.bio && (
        <div className={styles.profile_bio}>
          <p>{user.bio}</p>
        </div>
      )}
      {user.location && (
        <div className={styles.profile_location}>
          <i className="fas fa-map-marker-alt"></i>
          <span>{user.location}</span>
        </div>
      )}
      {user.company && (
        <div className={styles.profile_company}>
          <i className="fas fa-building"></i>
          <span>@{user.company}</span>
        </div>
      )}
      <div className={styles.profile_followers}>
        <div className={styles.followers}>
          <span className={styles.count}>{user.followers}</span>
          <span className={styles.label}>Followers</span>
        </div>
        <div className={styles.following}>
          <span className={styles.count}>{user.following}</span>
          <span className={styles.label}>Following</span>
        </div>
      </div>
      {hasSocialLinks && (
        <div className={styles.profile_social_media}>
          {social.twitter && (
            <a href={`https://twitter.com/${social.twitter}`} className={styles.social_link} target="_blank" rel="noopener noreferrer">
              <i className="fab fa-twitter"></i>
            </a>
          )}
          {social.linkedin && (
            <a href={`https://linkedin.com/in/${social.linkedin}`} className={styles.social_link} target="_blank" rel="noopener noreferrer">
              <i className="fab fa-linkedin"></i>
            </a>
          )}
          {user.website && (
            <a href={user.website} className={styles.social_link} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-globe"></i>
            </a>
          )}
        </div>
      )}
    </aside>
  );
}

export default UserProfileCard;