import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('API Health Check', () => {
  it('should return status 200 and ok message', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.message).toBe('Backend is running smoothly!');
  });
});