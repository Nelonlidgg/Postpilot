
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

describe('PostPilot API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1 should return the welcome message', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Welcome to the PostPilot API!');
  });

  it('GET /api/v1/health should report API liveness', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('GET /api/v1/health/ready should report database readiness', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body.status).toBe('ready');
    expect(response.body.database).toBe('connected');
  });
});
