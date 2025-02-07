const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    avatar_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    followers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    following: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    public_repos: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    social: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        get() {
            const rawValue = this.getDataValue('social');
            return rawValue || {};
        }
    },
    last_fetched: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            const date = this.getDataValue('last_fetched');
            return date instanceof Date ? date : new Date(date);
        }
    },
    is_fetching: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    organizations: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        get() {
            const rawValue = this.getDataValue('organizations');
            return rawValue || [];
        }
    },
    gists_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    last_gist_fetch: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
            const date = this.getDataValue('last_gist_fetch');
            return date ? new Date(date) : null;
        }
    },
    last_org_fetch: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
            const date = this.getDataValue('last_org_fetch');
            return date ? new Date(date) : null;
        }
    }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['username'] },
    ],
    hooks: {
        beforeSave: (instance) => {
            // Ensure social is an object
            if (!instance.social) instance.social = {};
            // Ensure organizations is an array  
            if (!instance.organizations) instance.organizations = [];
        }
    }
});

module.exports = User;