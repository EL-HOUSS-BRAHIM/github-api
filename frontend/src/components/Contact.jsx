import React from 'react';
import styles from '../styles/StaticPage.module.css';

function Contact() {
  return (
    <div className={styles.page}>
      <header className={styles.page_header}>
        <h1 className={styles.page_title}>Contact</h1>
        <p className={styles.page_lead}>
          Need help interpreting a report or want to suggest a feature? Reach out and we&apos;ll follow up within
          one business day.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.section_card}>
          <h2 className={styles.section_title}>Support channels</h2>
          <p className={styles.section_body}>
            GitHub Report is an API-first product, so we keep our support lines close to the code. Use the options
            below to file an issue, discuss roadmap ideas, or share feedback about the ranking and activity data sets.
          </p>
          <div className={styles.contact_list}>
            <div className={styles.contact_item}>
              <span className={styles.contact_label}>Email</span>
              <a className={styles.contact_link} href="mailto:support@githubreport.dev">support@githubreport.dev</a>
            </div>
            <div className={styles.contact_item}>
              <span className={styles.contact_label}>GitHub Issues</span>
              <a
                className={styles.contact_link}
                href="https://github.com/EL-HOUSS-BRAHIM/github-api/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/EL-HOUSS-BRAHIM/github-api/issues
              </a>
            </div>
            <div className={styles.contact_item}>
              <span className={styles.contact_label}>Documentation</span>
              <a
                className={styles.contact_link}
                href="https://github.com/EL-HOUSS-BRAHIM/github-api#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                Project README
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.section_card}>
          <h2 className={styles.section_title}>When you&apos;ll hear from us</h2>
          <p className={styles.section_body}>
            We triage production issues immediately and typically resolve ingestion or caching questions within 24 hours.
            Feature requests are reviewed weekly so we can fold them into the roadmap for the next release cycle.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Contact;
