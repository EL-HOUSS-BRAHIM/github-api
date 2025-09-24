import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../styles/RepoList.module.css';
import { formatRepoDate, formatRepoSize } from '../utils/metrics';

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
              <div className={styles.repo_stats}>
                <span className={styles.stars} title="Stars">
                  <i className="fas fa-star"></i> {repo.stars ?? 0}
                </span>
                <span className={styles.forks} title="Forks">
                  <i className="fas fa-code-branch"></i> {repo.forks ?? 0}
                </span>
                <span className={styles.issues} title="Open Issues">
                  <i className="fas fa-exclamation-circle"></i> {repo.issues ?? 0}
                </span>
                <span className={styles.commits} title="Recorded commits">
                  <i className="fas fa-history"></i> {repo.commit_count ?? 0}
                </span>
                <span className={styles.watchers} title="Watchers">
                  <i className="fas fa-eye"></i> {repo.watchers ?? 0}
                </span>
              </div>
            </div>

            <div className={styles.repo_details}>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-code"></i>
                {repo.language || 'Language unknown'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-clock"></i>
                Last commit: {repo.last_commit ? new Date(repo.last_commit).toLocaleDateString() : 'N/A'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-history"></i>
                {repo.commit_count ?? 0} commits tracked
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-tags"></i>
                {repo.topics?.length ? repo.topics.join(', ') : 'No topics'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-code-branch"></i>
                Default branch: {repo.default_branch || 'Unknown'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-balance-scale"></i>
                License: {repo.license || 'Not specified'}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-database"></i>
                {formatRepoSize(repo.size)}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-calendar-plus"></i>
                Created: {formatRepoDate(repo.created_at)}
              </div>
              <div className={styles.repo_detail_item}>
                <i className="fas fa-calendar-alt"></i>
                Updated: {formatRepoDate(repo.updated_at)}
              </div>
              {repo.homepage && (
                <div className={styles.repo_detail_item}>
                  <i className="fas fa-link"></i>
                  <a
                    href={repo.homepage}
                    className={styles.repo_detail_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.homepage}
                  </a>
                </div>
              )}
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