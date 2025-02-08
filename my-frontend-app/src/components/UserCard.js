import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile } from '../services/api';

function UserCard() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await getUserProfile(username);
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [username]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="user-card">
      <h2>{user.username}</h2>
      {user.avatar_url && (
        <img src={user.avatar_url} alt={user.username} width="150" />
      )}
      <p>{user.bio}</p>
      <p><strong>Location:</strong> {user.location}</p>
      <p><strong>Followers:</strong> {user.followers}</p>
      <p><strong>Public Repos:</strong> {user.public_repos}</p>
    </div>
  );
}

export default UserCard;