import * as dotenv from 'dotenv';
dotenv.config();

export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-key-123';
  return secret;
}