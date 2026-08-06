const { Client } = require('pg');

async function enableVector() {
  const client = new Client({
    connectionString: 'postgresql://postgres:post1234@localhost:5432/qna',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL qna database...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Successfully enabled vector extension in qna database!');
  } catch (err) {
    console.error('Error enabling vector extension:', err.message);
  } finally {
    await client.end();
  }
}

enableVector();
