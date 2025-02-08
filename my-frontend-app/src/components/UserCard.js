import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, getUserRepos, getUserRanking, getUserActivity } from '../services/api';

function UserCard() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const [userData, reposData, rankingData, activityData] = await Promise.all([
          getUserProfile(username),
          getUserRepos(username),
          getUserRanking(username),
          getUserActivity(username)
        ]);

        setUser(userData);
        setRepos(reposData);
        setRanking(rankingData);
        setActivity(activityData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [username]);

  if (loading) return <div className="loading">Loading user data...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="user-profile">
      <div className="user-card">
        <div className="user-header">
          <img src={user.avatar_url} alt={user.username} className="avatar" />
          <h2>{user.username}</h2>
        </div>
        
        <div className="user-info">
          <p>{user.bio}</p>
          <p><strong>Location:</strong> {user.location}</p>
          <p><strong>Followers:</strong> {user.followers}</p>
          <p><strong>Following:</strong> {user.following}</p>
          <p><strong>Public Repos:</strong> {user.public_repos}</p>
        </div>

        {ranking && (
          <div className="user-ranking">
            <h3>Ranking</h3>
            <p>Score: {ranking.score}</p>
            <p>Rank: {ranking.rank}</p>
          </div>
        )}

        <div className="user-repos">
          <h3>Recent Repositories</h3>
          <ul>
            {repos.slice(0, 5).map(repo => (
              <li key={repo.id}>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                  {repo.name}
                </a>
                <span>{repo.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="user-activity">
          <h3>Recent Activity</h3>
          <ul>
            {activity.slice(0, 5).map(event => (
              <li key={event.id}>
                {event.type}: {event.repo.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UserCard;