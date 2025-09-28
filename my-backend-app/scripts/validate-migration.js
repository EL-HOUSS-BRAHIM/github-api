#!/usr/bin/env node

/**
 * Migration validation script
 * Tests the new AWS-integrated configuration
 */

const path = require('path');

console.log('🧪 GitHub API Migration Validation\n');

async function validateConfiguration() {
  console.log('1️⃣  Testing configuration loading...');
  try {
    const config = require('../src/config');
    
    if (typeof config.initializeConfig === 'function') {
      console.log('   ✅ AWS Secrets Manager integration detected');
      console.log('   ⏳ Initializing configuration (will use env vars for local testing)...');
      const initializedConfig = await config.initializeConfig();
      console.log('   ✅ Configuration initialized successfully');
      console.log(`   📍 Environment: ${initializedConfig.nodeEnv}`);
      console.log(`   🗃️  Database: ${initializedConfig.db.host}:${initializedConfig.db.port}`);
      console.log(`   📦 Cache: ${initializedConfig.redis.host}:${initializedConfig.redis.port}`);
    } else {
      console.log('   ✅ Static configuration loaded');
      console.log(`   📍 Environment: ${config.nodeEnv}`);
      console.log(`   🗃️  Database: ${config.db.host}:${config.db.port}`);
      console.log(`   📦 Cache: ${config.redis.host}:${config.redis.port}`);
    }
  } catch (error) {
    console.log('   ❌ Configuration loading failed:', error.message);
    return false;
  }
  
  return true;
}

async function validateServices() {
  console.log('\n2️⃣  Testing service initialization...');
  
  try {
    console.log('   ⏳ Loading AWS Secrets Manager service...');
    const secretsManager = require('../src/services/aws/secretsManager');
    console.log('   ✅ Secrets Manager service loaded');
    
    console.log('   ⏳ Loading SES service...');
    const sesService = require('../src/services/aws/ses');
    console.log('   ✅ SES service loaded');
    
    return true;
  } catch (error) {
    console.log('   ❌ Service loading failed:', error.message);
    return false;
  }
}

async function validateMigrations() {
  console.log('\n3️⃣  Testing migration system...');
  
  try {
    const { getMigrator } = require('../src/database/migrator');
    console.log('   ✅ Migration system loaded');
    return true;
  } catch (error) {
    console.log('   ❌ Migration system failed:', error.message);
    return false;
  }
}

async function validateDependencies() {
  console.log('\n4️⃣  Checking dependencies...');
  
  const requiredDeps = {
    '@aws-sdk/client-secrets-manager': 'AWS Secrets Manager SDK',
    '@aws-sdk/client-ses': 'AWS SES SDK',
    'pg': 'PostgreSQL client',
    'pg-hstore': 'PostgreSQL hstore support',
    'sequelize': 'ORM'
  };
  
  let allValid = true;
  
  for (const [dep, description] of Object.entries(requiredDeps)) {
    try {
      require(dep);
      console.log(`   ✅ ${description} (${dep})`);
    } catch (error) {
      console.log(`   ❌ ${description} (${dep}) - ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

async function validateFiles() {
  console.log('\n5️⃣  Checking required files...');
  
  const fs = require('fs');
  const requiredFiles = [
    '../src/services/aws/secretsManager.js',
    '../src/services/aws/ses.js',
    '../migrations/20250101000000-postgresql-initial-schema.js',
    '../.env.aws.example',
    '../docker-compose.aws.yml',
    '../Dockerfile.aws',
    '../scripts/deploy-aws.sh',
    '../docs/AWS-MIGRATION.md'
  ];
  
  let allExist = true;
  
  for (const file of requiredFiles) {
    const fullPath = path.resolve(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - missing`);
      allExist = false;
    }
  }
  
  return allExist;
}

async function main() {
  let overallSuccess = true;
  
  const tests = [
    validateConfiguration,
    validateServices,
    validateMigrations,
    validateDependencies,
    validateFiles
  ];
  
  for (const test of tests) {
    const result = await test();
    if (!result) {
      overallSuccess = false;
    }
  }
  
  console.log('\n📋 Validation Summary:');
  if (overallSuccess) {
    console.log('   🎉 All validations passed! Migration setup is complete.');
    console.log('\n📚 Next steps:');
    console.log('   1. Set up AWS infrastructure (RDS, ElastiCache, Secrets Manager)');
    console.log('   2. Configure AWS credentials and secrets');
    console.log('   3. Run: docker-compose -f docker-compose.aws.yml up -d');
    console.log('   4. Run: npm run migrate');
    console.log('   5. Run: npm start');
    console.log('\n📖 See docs/AWS-MIGRATION.md for detailed instructions');
  } else {
    console.log('   ⚠️  Some validations failed. Please check the issues above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };