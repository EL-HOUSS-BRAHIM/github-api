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
    <div className={styles.github_profile_repo}>
      <div className={styles.repo_header}>
        <h2>Popular Repositories</h2>
        <div className={styles.repo_filters}>
          <select id="repoSort" className={styles.repo_sort_select}>
            <option value="stars">Most Stars</option>
            <option value="forks">Most Forks</option>
            <option value="updated">Recently Updated</option>
            <option value="created">Newly Created</option>
          </select>
        </div>
      </div>

      <div className={styles.repo_list}>
        {repos.map(repo => (
          <div key={repo.name} className={styles.repo_item}>
            <div className={styles.repo_header_info}>
              <div className={styles.repo_title}>
                <h3>
                  <i className="fas fa-bookmark"></i> {repo.name}
                </h3>
                <span className={styles.repo_visibility}>Public</span>
              </div>
              <p>{repo.description || 'No description'}</p>
            </div>

            <div className={styles.repo_meta}>
              <div className={styles.repo_language}>
                <span className={styles.lang_dot} style={{ background: '#f1e05a' }}></span>
                {repo.language || 'Unknown'}
              </div>
              <div className={styles.repo_stats}>
                <span className={styles.stars} title="Stars">
                  <i className="fas fa-star"></i> {repo.stars}
                </span>
                <span className={styles.forks} title="Forks">
                  <i className="fas fa-code-branch"></i> {repo.forks}
                </span>
                <span className={styles.issues} title="Open Issues">
                  <i className="fas fa-exclamation-circle"></i> {repo.issues}
                </span>
                <span className={styles.prs} title="Pull Requests">
                  <i className="fas fa-code-pull-request"></i> {repo.pull_requests}
                </span>
              </div>
            </div>

            <div className={styles.repo_details}>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-clock"></i>
                Last commit: {repo.last_commit ? new Date(repo.last_commit).toLocaleDateString() : 'N/A'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-history"></i>
                {repo.commits} commits
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-balance-scale"></i>
                {repo.license || 'No license'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-database"></i>
                {repo.size} MB
              </div>
            </div>

            <div className={styles.repo_dates}>
              <span>Created: {new Date(repo.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(repo.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

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