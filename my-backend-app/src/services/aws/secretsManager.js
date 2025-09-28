const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

class SecretsManagerService {
  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get secret value from AWS Secrets Manager with caching
   * @param {string} secretName - Name of the secret
   * @param {boolean} forceRefresh - Force refresh the cache
   * @returns {Promise<Object>} Secret value parsed as JSON
   */
  async getSecret(secretName, forceRefresh = false) {
    const cacheKey = secretName;
    const cachedValue = this.cache.get(cacheKey);
    
    // Return cached value if not expired and not forcing refresh
    if (cachedValue && !forceRefresh && Date.now() - cachedValue.timestamp < this.cacheTimeout) {
      return cachedValue.value;
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: 'AWSCURRENT', // Always get the current version for rotation support
      });

      const result = await this.client.send(command);
      const secretValue = JSON.parse(result.SecretString);

      // Cache the secret
      this.cache.set(cacheKey, {
        value: secretValue,
        timestamp: Date.now(),
      });

      return secretValue;
    } catch (error) {
      console.error(`Error retrieving secret ${secretName}:`, error);
      
      // If we have a cached value, return it as fallback
      if (cachedValue) {
        console.warn(`Using cached value for secret ${secretName} due to error`);
        return cachedValue.value;
      }
      
      throw new Error(`Failed to retrieve secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * Get database configuration from AWS Secrets Manager
   * @returns {Promise<Object>} Database configuration
   */
  async getDatabaseConfig() {
    const secretName = process.env.AWS_DB_SECRET_NAME || 'github-api/database';
    const secret = await this.getSecret(secretName);
    
    return {
      host: secret.host,
      port: secret.port || 5432,
      username: secret.username,
      password: secret.password,
      database: secret.dbname || secret.database,
      ssl: secret.ssl !== false, // Default to true for AWS RDS
    };
  }

  /**
   * Get GitHub tokens from AWS Secrets Manager
   * @returns {Promise<Array<string>>} Array of GitHub tokens
   */
  async getGitHubTokens() {
    const secretName = process.env.AWS_GITHUB_SECRET_NAME || 'github-api/github-tokens';
    try {
      const secret = await this.getSecret(secretName);
      
      // Support multiple token formats
      if (Array.isArray(secret.tokens)) {
        return secret.tokens;
      }
      
      if (typeof secret.tokens === 'string') {
        return secret.tokens.split(',').map(token => token.trim()).filter(token => token);
      }
      
      // Fallback: look for comma-separated tokens in 'value' field
      if (secret.value && typeof secret.value === 'string') {
        return secret.value.split(',').map(token => token.trim()).filter(token => token);
      }
      
      console.warn('No GitHub tokens found in secret');
      return [];
    } catch (error) {
      console.warn('Failed to retrieve GitHub tokens from Secrets Manager:', error.message);
      return [];
    }
  }

  /**
   * Get Redis configuration from AWS Secrets Manager
   * @returns {Promise<Object>} Redis configuration
   */
  async getRedisConfig() {
    const secretName = process.env.AWS_REDIS_SECRET_NAME || 'github-api/redis';
    try {
      const secret = await this.getSecret(secretName);
      
      return {
        host: secret.host,
        port: secret.port || 6380, // Default Valkey port
        username: secret.username,
        password: secret.password,
        tls: secret.tls !== false, // Default to true for AWS ElastiCache
        family: secret.family || 4, // 4 (IPv4) or 6 (IPv6)
      };
    } catch (error) {
      console.warn('Failed to retrieve Redis config from Secrets Manager:', error.message);
      // Return default local configuration as fallback
      return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true',
      };
    }
  }

  /**
   * Get SES configuration from AWS Secrets Manager
   * @returns {Promise<Object>} SES configuration
   */
  async getSESConfig() {
    const secretName = process.env.AWS_SES_SECRET_NAME || 'github-api/ses';
    try {
      const secret = await this.getSecret(secretName);
      
      return {
        region: secret.region || process.env.AWS_REGION || 'us-east-1',
        fromEmail: secret.fromEmail,
        fromName: secret.fromName || 'GitHub API',
        replyToEmail: secret.replyToEmail,
        configurationSetName: secret.configurationSetName,
      };
    } catch (error) {
      console.warn('Failed to retrieve SES config from Secrets Manager:', error.message);
      return {
        region: process.env.AWS_REGION || 'us-east-1',
        fromEmail: process.env.SES_FROM_EMAIL,
        fromName: process.env.SES_FROM_NAME || 'GitHub API',
      };
    }
  }

  /**
   * Clear cache for a specific secret or all secrets
   * @param {string} secretName - Optional secret name to clear specific cache
   */
  clearCache(secretName = null) {
    if (secretName) {
      this.cache.delete(secretName);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache stats for monitoring
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      timeout: this.cacheTimeout,
    };
  }
}

// Export singleton instance
module.exports = new SecretsManagerService();