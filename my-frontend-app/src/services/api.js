export async function getUserProfile(username) {
    const response = await fetch(`/api/user/${username}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  }
  
  // You can add more API utility functions here (e.g. getUserRepos, getUserActivity)