import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../styles/RepoList.module.css';

function RepoList({ username }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getUserRepos(username, page, perPage);
        setRepos(response.data.repos);
        setTotalCount(response.data.total_count);
      } catch (err) {
        setError(err.message || 'Failed to load repositories.');
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [username, page, perPage]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (loading) {
    return <p className={styles.loading_message}>Loading repositories...</p>;
  }

  if (error) {
    return <p className={styles.error_message}>Error: {error}</p>;
  }

  if (!repos.length) {
    return <p>No repositories found.</p>;
  }

  return (
    <div>
      <ul className={styles.repo_list}>
        {repos.map(repo => (
          <li key={repo.name} className={styles.repo_card}>
            <h3>{repo.name}</h3>
            <p>{repo.description || 'No description'}</p>
            <p>Stars: {repo.stars} | Forks: {repo.forks} | Issues: {repo.issues}</p>
            {repo.topics && repo.topics.length > 0 && (
              <p>Topics: {repo.topics.join(', ')}</p>
            )}
            <p>Last Commit: {repo.last_commit ? new Date(repo.last_commit).toLocaleDateString() : 'N/A'}</p>
          </li>
        ))}
      </ul>

      <div className={styles.pagination}>
        <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
          Previous Page
        </button>
        <span>Page {page} of {Math.ceil(totalCount / perPage)}</span>
        <button onClick={() => handlePageChange(page + 1)} disabled={page >= Math.ceil(totalCount / perPage)}>
          Next Page
        </button>
      </div>
    </div>
  );
}

export default RepoList;