const { Client } = require('pg');

async function enableVector() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Successfully enabled vector extension in database!');
  } catch (err) {
    console.error('Error enabling vector extension:', err.message);
  } finally {
    await client.end();
  }
}

enableVector();
