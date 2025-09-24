import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../styles/RepoList.module.css';
import { formatRepoDate, formatRepoSize } from '../utils/metrics';

const SKELETON_PLACEHOLDERS = [0, 1, 2];

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

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage) || 1);

  return (
    <div className={styles.github_profile_repo}>
      <div className={styles.repo_header}>
        <h2>Popular Repositories</h2>
        <div className={styles.repo_filters}>
          <label htmlFor="repoSort" className={styles.visually_hidden}>Sort repositories</label>
          <select
            id="repoSort"
            className={styles.repo_sort_select}
            aria-label="Sort repositories"
            defaultValue="stars"
            disabled
          >
            <option value="stars">Most Stars</option>
            <option value="forks">Most Forks</option>
            <option value="updated">Recently Updated</option>
            <option value="created">Newly Created</option>
          </select>
          <span className={styles.repo_filters_hint}>Sorting is automatically handled by the API.</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeleton_list} role="status" aria-live="polite">
          {SKELETON_PLACEHOLDERS.map((placeholder) => (
            <div key={placeholder} className={styles.skeleton_item}>
              <div className={styles.skeleton_title} />
              <div className={styles.skeleton_meta}>
                <span className={styles.skeleton_pill} />
                <span className={styles.skeleton_pill} />
                <span className={styles.skeleton_pill} />
              </div>
              <div className={styles.skeleton_lines}>
                <span className={styles.skeleton_line} />
                <span className={styles.skeleton_line} />
                <span className={`${styles.skeleton_line} ${styles.skeleton_line_short}`} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className={styles.error_message} role="alert">Error: {error}</p>
      ) : repos.length === 0 ? (
        <p className={styles.empty_state}>No repositories found.</p>
      ) : (
        <>
          <div className={styles.repo_list}>
            {repos.map((repo) => (
              <div key={repo.name} className={styles.repo_item}>
                <div className={styles.repo_header_info}>
                  <div className={styles.repo_title}>
                    <h3>
                      <i className="fas fa-bookmark" aria-hidden="true"></i>
                      {repo.name}
                    </h3>
                    <span className={styles.repo_visibility}>Public</span>
                  </div>
                  <p>{repo.description || 'No description'}</p>
                </div>

                <div className={styles.repo_meta}>
                  <div className={styles.repo_stats}>
                    <span className={styles.stars} title="Stars">
                      <i className="fas fa-star" aria-hidden="true"></i>
                      {repo.stars ?? 0}
                    </span>
                    <span className={styles.forks} title="Forks">
                      <i className="fas fa-code-branch" aria-hidden="true"></i>
                      {repo.forks ?? 0}
                    </span>
                    <span className={styles.issues} title="Open Issues">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {repo.issues ?? 0}
                    </span>
                    <span className={styles.commits} title="Recorded commits">
                      <i className="fas fa-history" aria-hidden="true"></i>
                      {repo.commit_count ?? 0}
                    </span>
                    <span className={styles.watchers} title="Watchers">
                      <i className="fas fa-eye" aria-hidden="true"></i>
                      {repo.watchers ?? 0}
                    </span>
                  </div>
                </div>

                <div className={styles.repo_details}>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-code" aria-hidden="true"></i>
                    {repo.language || 'Language unknown'}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-clock" aria-hidden="true"></i>
                    Last commit: {repo.last_commit ? new Date(repo.last_commit).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-history" aria-hidden="true"></i>
                    {repo.commit_count ?? 0} commits tracked
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-tags" aria-hidden="true"></i>
                    {repo.topics?.length ? repo.topics.join(', ') : 'No topics'}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-code-branch" aria-hidden="true"></i>
                    Default branch: {repo.default_branch || 'Unknown'}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-balance-scale" aria-hidden="true"></i>
                    License: {repo.license || 'Not specified'}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-database" aria-hidden="true"></i>
                    {formatRepoSize(repo.size)}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-calendar-plus" aria-hidden="true"></i>
                    Created: {formatRepoDate(repo.created_at)}
                  </div>
                  <div className={styles.repo_detail_item}>
                    <i className="fas fa-calendar-alt" aria-hidden="true"></i>
                    Updated: {formatRepoDate(repo.updated_at)}
                  </div>
                  {repo.homepage && (
                    <div className={styles.repo_detail_item}>
                      <i className="fas fa-link" aria-hidden="true"></i>
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

          <div className={styles.pagination} role="navigation" aria-label="Repository pages">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous Page
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next Page
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default RepoList;