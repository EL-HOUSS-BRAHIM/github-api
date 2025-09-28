'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Users table
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      avatar_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      company: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      followers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      following: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      public_repos: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      social: {
        type: Sequelize.JSONB, // PostgreSQL JSONB for better performance
        allowNull: true,
      },
      last_fetched: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      is_fetching: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      organizations: {
        type: Sequelize.JSONB, // PostgreSQL JSONB
        allowNull: true,
      },
      gists_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_gist_fetch: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_org_fetch: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create Repositories table
    await queryInterface.createTable('Repositories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      topics: {
        type: Sequelize.JSONB, // PostgreSQL JSONB
        allowNull: true,
      },
      primary_language: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      license: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      stars: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      forks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      issues: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_commit: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      commit_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pull_request_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      watchers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      default_branch: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'main',
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_fork: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_archived: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      has_wiki: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      has_pages: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      pushed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create Activities table
    await queryInterface.createTable('Activities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      commit_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pr_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      issue_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      review_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_contributions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create UserRankings table
    await queryInterface.createTable('UserRankings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      country: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_commits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_contributions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      followers: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      public_repos: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      global_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      country_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      last_calculated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create RankingSnapshots table
    await queryInterface.createTable('RankingSnapshots', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      followers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      public_repos: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      global_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      country_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ranking_calculated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      job_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes for better performance
    await queryInterface.addIndex('Users', ['username']);
    await queryInterface.addIndex('Users', ['location']);
    await queryInterface.addIndex('Users', ['last_fetched']);
    
    await queryInterface.addIndex('Repositories', ['user_id']);
    await queryInterface.addIndex('Repositories', ['user_id', 'name']);
    await queryInterface.addIndex('Repositories', ['primary_language']);
    await queryInterface.addIndex('Repositories', ['stars']);
    
    await queryInterface.addIndex('Activities', ['user_id']);
    await queryInterface.addIndex('Activities', ['user_id', 'date']);
    await queryInterface.addIndex('Activities', ['date']);
    
    await queryInterface.addIndex('UserRankings', ['user_id']);
    await queryInterface.addIndex('UserRankings', ['country']);
    await queryInterface.addIndex('UserRankings', ['global_rank']);
    await queryInterface.addIndex('UserRankings', ['country_rank']);
    await queryInterface.addIndex('UserRankings', ['score']);
    
    await queryInterface.addIndex('RankingSnapshots', ['user_id']);
    await queryInterface.addIndex('RankingSnapshots', ['recorded_at']);
    await queryInterface.addIndex('RankingSnapshots', ['job_id']);

    // Add unique constraints
    await queryInterface.addConstraint('Activities', {
      fields: ['user_id', 'date'],
      type: 'unique',
      name: 'unique_user_activity_date',
    });

    await queryInterface.addConstraint('UserRankings', {
      fields: ['user_id'],
      type: 'unique',
      name: 'unique_user_ranking',
    });
  },

  async down(queryInterface) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('RankingSnapshots');
    await queryInterface.dropTable('UserRankings');
    await queryInterface.dropTable('Activities');
    await queryInterface.dropTable('Repositories');
    await queryInterface.dropTable('Users');
  },
};