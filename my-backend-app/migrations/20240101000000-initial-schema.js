'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
        type: Sequelize.JSON,
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
        type: Sequelize.JSON,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

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
        type: Sequelize.JSON,
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
        allowNull: true,
        defaultValue: 0,
      },
      homepage: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      default_branch: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      source_created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      source_updated_at: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('Repositories', {
      name: 'repositories_user_id_name',
      unique: true,
      fields: ['user_id', 'name'],
    });

    await queryInterface.addIndex('Repositories', {
      name: 'repositories_stars',
      fields: ['stars'],
    });

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
      commits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pull_requests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      issues_opened: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('Activities', {
      name: 'activities_user_id',
      fields: ['user_id'],
    });

    await queryInterface.addIndex('Activities', {
      name: 'activities_date',
      fields: ['date'],
    });

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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RankingSnapshots');
    await queryInterface.dropTable('UserRankings');
    await queryInterface.dropTable('Activities');
    await queryInterface.dropTable('Repositories');
    await queryInterface.dropTable('Users');
  },
};
