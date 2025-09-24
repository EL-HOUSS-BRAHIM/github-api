import React from 'react';
import styles from '../styles/StaticPage.module.css';

function About() {
  return (
    <div className={styles.page}>
      <header className={styles.page_header}>
        <h1 className={styles.page_title}>About GitHub Report</h1>
        <p className={styles.page_lead}>
          GitHub Report brings together harvesting queues, cached analytics, and a focused user
          experience so you can explore contribution insights without wrestling with the raw GitHub API.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.section_card}>
          <h2 className={styles.section_title}>Why we built it</h2>
          <p className={styles.section_body}>
            Teams, hiring managers, and open-source maintainers often need a reliable snapshot of how a developer
            collaborates across repositories. GitHub Report automates the heavy lifting: we harvest public data,
            normalize it across events, and calculate meaningful metrics like active streaks, contribution totals,
            and regional rankings. The goal is to replace manual spreadsheets with a living profile that stays in sync
            with GitHub activity.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.section_card}>
          <h2 className={styles.section_title}>Platform highlights</h2>
          <div className={styles.highlight_grid}>
            <div className={styles.highlight_card}>
              <h3 className={styles.highlight_card_title}>Contribution analytics</h3>
              <p className={styles.highlight_card_body}>
                Aggregate commits, pull requests, and issues into daily activity, streaks, and contribution averages
                so you can spot momentum at a glance.
              </p>
            </div>
            <div className={styles.highlight_card}>
              <h3 className={styles.highlight_card_title}>Ranking insights</h3>
              <p className={styles.highlight_card_body}>
                Country-aware leaderboards pair follower counts with repository health to show how developers compare
                locally and globally.
              </p>
            </div>
            <div className={styles.highlight_card}>
              <h3 className={styles.highlight_card_title}>Performance minded</h3>
              <p className={styles.highlight_card_body}>
                Redis-backed caches, Bull queues, and token rotation guard against rate limits while keeping profile
                refreshes snappy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.section_card}>
          <h2 className={styles.section_title}>Built for curious teams</h2>
          <p className={styles.section_body}>
            From engineering managers monitoring onboarding to developers showcasing their open-source footprint,
            GitHub Report delivers a single, trustworthy dashboard. The backend exposes a clean REST API, so you can
            embed analytics into internal tooling or automate follow-up workflows with ease.
          </p>
        </div>
      </section>
    </div>
  );
}

export default About;
