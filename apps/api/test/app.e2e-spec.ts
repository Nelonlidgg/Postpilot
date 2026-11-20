
import { Test } from '@nestjs/testing';
import {
  ValidationPipe,
} from '@nestjs/common';

import type {
  INestApplication,
} from '@nestjs/common';

import {
  beforeAll,
  afterAll,
  describe,
  it,
  expect,
} from 'vitest';

import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('PostPilot API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const prefix = '/api/v1/auth';

  const password = 'PostPilotTestPassword123!';

  const testEmails: string[] = [];

  const registerUser = async () => {
    const email =
      `test-${randomUUID()}@example.com`;

    testEmails.push(email);

    const response = await request(
      app.getHttpServer(),
    )
      .post(`${prefix}/register`)
      .send({
        name: 'Test User',
        email,
        password,
      })
      .expect(201);

    return {
      email,
      user: response.body.user,
    };
  };

  const loginUser = async (email: string) => {
    const response = await request(
      app.getHttpServer(),
    )
      .post(`${prefix}/login`)
      .send({
        email,
        password,
      })
      .expect(200);

    return response.body;
  };

  beforeAll(async () => {
    const databaseUrl =
      process.env.DATABASE_URL;

    if (
      !databaseUrl ||
      new URL(databaseUrl).pathname !==
        '/postpilot_test'
    ) {
      throw new Error(
        'Authentication tests require the postpilot_test database',
      );
    }

    const moduleFixture =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app =
      moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (prisma && testEmails.length > 0) {
        await prisma.user.deleteMany({
          where: {
            email: {
              in: testEmails,
            },
          },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('should return the welcome message', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect(
        'Welcome to the PostPilot API!',
      );
  });

  it('should report API liveness', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('should report database readiness', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body.status).toBe('ready');
  });

  it('should register a user without exposing the password hash', async () => {
    const { email, user } =
      await registerUser();

    expect(user.email).toBe(email);

    expect(user).not.toHaveProperty(
      'passwordHash',
    );

    const storedUser =
      await prisma.user.findUniqueOrThrow({
        where: {
          email,
        },
      });

    expect(
      storedUser.passwordHash,
    ).toMatch(/^\$argon2id\$/);

    expect(
      storedUser.passwordHash,
    ).not.toBe(password);
  });

  it('should reject duplicate registration', async () => {
    const { email } = await registerUser();

    await request(app.getHttpServer())
      .post(`${prefix}/register`)
      .send({
        name: 'Duplicate User',
        email,
        password,
      })
      .expect(409);
  });

  it('should reject invalid registration data', async () => {
    await request(app.getHttpServer())
      .post(`${prefix}/register`)
      .send({
        name: 'T',
        email: 'invalid-email',
        password: 'short',
        role: 'admin',
      })
      .expect(400);
  });

  it('should reject an incorrect password', async () => {
    const { email } = await registerUser();

    await request(app.getHttpServer())
      .post(`${prefix}/login`)
      .send({
        email,
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('should log in and access a protected route', async () => {
    const { email } = await registerUser();

    const tokens = await loginUser(email);

    expect(tokens.accessToken).toBeTruthy();

    expect(tokens.refreshToken).toMatch(
      /^[a-f0-9]{64}$/,
    );

    const response = await request(
      app.getHttpServer(),
    )
      .get(`${prefix}/me`)
      .set(
        'Authorization',
        `Bearer ${tokens.accessToken}`,
      )
      .expect(200);

    expect(response.body.email).toBe(email);

    expect(response.body).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('should reject a request without an access token', async () => {
    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .expect(401);
  });

  it('should reject an invalid access token', async () => {
    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .set('Authorization', 'Bearer invalid')
      .expect(401);
  });

  it('should rotate refresh tokens and detect reuse', async () => {
    const { email } = await registerUser();

    const original = await loginUser(email);

    const rotated = await request(
      app.getHttpServer(),
    )
      .post(`${prefix}/refresh`)
      .send({
        refreshToken:
          original.refreshToken,
      })
      .expect(200);

    expect(
      rotated.body.refreshToken,
    ).not.toBe(original.refreshToken);

    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .set(
        'Authorization',
        `Bearer ${rotated.body.accessToken}`,
      )
      .expect(200);

    // Reuse the old refresh token.
    await request(app.getHttpServer())
      .post(`${prefix}/refresh`)
      .send({
        refreshToken:
          original.refreshToken,
      })
      .expect(401);

    // The new token must now be rejected.
    await request(app.getHttpServer())
      .post(`${prefix}/refresh`)
      .send({
        refreshToken:
          rotated.body.refreshToken,
      })
      .expect(401);

    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .set(
        'Authorization',
        `Bearer ${rotated.body.accessToken}`,
      )
      .expect(401);
  });

  it('should serialize concurrent refresh requests', async () => {
    const { email } = await registerUser();

    const tokens = await loginUser(email);

    const refresh = () =>
      request(app.getHttpServer())
        .post(`${prefix}/refresh`)
        .send({
          refreshToken:
            tokens.refreshToken,
        });

    const results = await Promise.all([
      refresh(),
      refresh(),
    ]);

    expect(
      results.map((result) =>
        result.status,
      ).sort(),
    ).toEqual([200, 401]);

    const successful =
      results.find((result) =>
        result.status === 200,
      )!;

    // Reuse detection revokes the session.
    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .set(
        'Authorization',
        `Bearer ${successful.body.accessToken}`,
      )
      .expect(401);
  });

  it('should revoke a session on logout', async () => {
    const { email } = await registerUser();

    const tokens = await loginUser(email);

    const authorization =
      `Bearer ${tokens.accessToken}`;

    await request(app.getHttpServer())
      .post(`${prefix}/logout`)
      .set(
        'Authorization',
        authorization,
      )
      .expect(200);

    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .set(
        'Authorization',
        authorization,
      )
      .expect(401);

    await request(app.getHttpServer())
      .post(`${prefix}/refresh`)
      .send({
        refreshToken:
          tokens.refreshToken,
      })
      .expect(401);
  });

  it('should prevent access to another user session', async () => {
    const firstUser = await registerUser();
    const secondUser = await registerUser();

    const first =
      await loginUser(firstUser.email);

    const second =
      await loginUser(secondUser.email);

    const sessions = await request(
      app.getHttpServer(),
    )
      .get(`${prefix}/sessions`)
      .set(
        'Authorization',
        `Bearer ${second.accessToken}`,
      )
      .expect(200);

    const sessionId =
      sessions.body[0].id;

    await request(app.getHttpServer())
      .delete(
        `${prefix}/sessions/${sessionId}`,
      )
      .set(
        'Authorization',
        `Bearer ${first.accessToken}`,
      )
      .expect(404);

    await request(app.getHttpServer())
      .get(`${prefix}/me`)
      .set(
        'Authorization',
        `Bearer ${second.accessToken}`,
      )
      .expect(200);
  });

  it('should rate-limit excessive registration requests', async () => {
    const responses: number[] = [];

    for (let i = 0; i < 21; i++) {
      const response = await request(
        app.getHttpServer(),
      )
        .post(`${prefix}/register`)
        .send({});

      responses.push(response.status);
    }

    expect(responses).toContain(429);

    expect(
      responses.every((status) =>
        [400, 429].includes(status),
      ),
    ).toBe(true);
  });
});
