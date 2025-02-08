const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:10776/api';

export async function getUserProfile(username) {
  const response = await fetch(`${API_URL}/user/${username}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

export async function getUserRepos(username) {
  const response = await fetch(`${API_URL}/user/${username}/repos`);
  if (!response.ok) {
    throw new Error('Failed to fetch user repositories');
  }
  return response.json();
}

export async function getUserRanking(username) {
  const response = await fetch(`${API_URL}/ranking/user/${username}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user ranking');
  }
  return response.json();
}

export async function getUserActivity(username) {
  const response = await fetch(`${API_URL}/user/${username}/activity`);
  if (!response.ok) {
    throw new Error('Failed to fetch user activity');
  }
  return response.json();
}