import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/SearchBar.module.css';

function SearchBar() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();

  const errorMessage = 'Enter a GitHub username to continue.';

  const handleChange = (event) => {
    const value = event.target.value;
    setUsername(value);

    if (status) {
      setStatus('');
    }

    if (value.trim()) {
      setError('');
    } else if (touched) {
      setError(errorMessage);
    }
  };

  const handleBlur = () => {
    if (!touched) {
      setTouched(true);
    }

    if (!username.trim()) {
      setError(errorMessage);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError(errorMessage);
      setStatus('');
      return;
    }

    setError('');
    setStatus(`Loading profile for ${trimmedUsername}...`);
    navigate(`/user/${trimmedUsername}`);
  };

  const errorId = error ? 'username-error' : undefined;
  const statusId = status ? 'username-status' : undefined;
  const describedBy = [errorId, statusId].filter(Boolean).join(' ') || undefined;

  return (
    <form className={styles.search_form} onSubmit={handleSubmit} noValidate>
      <label htmlFor="usernameInput" className={styles.visually_hidden}>
        GitHub username
      </label>
      <div className={styles.search_box}>
        <input
          type="text"
          id="usernameInput"
          name="username"
          placeholder="Enter GitHub username"
          value={username}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          autoComplete="off"
        />
        <button
          id="searchButton"
          type="submit"
          disabled={!username.trim()}
        >
          <i className="fas fa-search" aria-hidden="true"></i>
          <span className={styles.button_label}>Generate Report</span>
        </button>
      </div>
      <div className={styles.search_feedback}>
        {error ? (
          <p id={errorId} role="alert" className={styles.error_message}>
            {error}
          </p>
        ) : null}
        {status ? (
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className={styles.status_message}
          >
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export default SearchBar;