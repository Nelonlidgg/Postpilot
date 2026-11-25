
import { randomUUID } from 'node:crypto';

import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Workspace API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const base = '/api/v1/workspaces';
  const password = 'TestPasswordForPostPilot123!';

  const testEmails: string[] = [];

  async function createAccount() {
    const email = `workspace-${randomUUID()}@example.com`;
    testEmails.push(email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Member',
        email,
        password,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      id: response.body.user.id as string,
      email,
      token: login.body.accessToken as string,
    };
  }

  async function createWorkspace(token: string) {
    const response = await request(app.getHttpServer())
      .post(base)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Workspace' })
      .expect(201);

    return response.body.id as string;
  }

  async function inviteAndJoin(
    workspaceId: string,
    ownerToken: string,
    member: { email: string; token: string },
    role: 'VIEWER' | 'EDITOR' = 'VIEWER',
  ) {
    const invitation = await request(app.getHttpServer())
      .post(`${base}/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: member.email,
        role,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base}/invitations/accept`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        token: invitation.body.invitationToken,
      })
      .expect(201);
  }

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;

    if (!url || new URL(url).pathname !== '/postpilot_test') {
      throw new Error(
        'Workspace tests must use postpilot_test',
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

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
      if (prisma && testEmails.length) {
        await prisma.user.deleteMany({
          where: { email: { in: testEmails } },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('creates a workspace with an owner membership', async () => {
    const owner = await createAccount();

    const workspaceId =
      await createWorkspace(owner.token);

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: owner.id,
        },
      },
    });

    expect(membership?.role).toBe('OWNER');
  });

  it('does not expose workspaces to nonmembers', async () => {
    const owner = await createAccount();
    const stranger = await createAccount();

    const workspaceId =
      await createWorkspace(owner.token);

    await request(app.getHttpServer())
      .get(`${base}/${workspaceId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(404);
  });

  it('allows an invited user to join as viewer', async () => {
    const owner = await createAccount();
    const viewer = await createAccount();

    const workspaceId =
      await createWorkspace(owner.token);

    await inviteAndJoin(
      workspaceId,
      owner.token,
      viewer,
    );

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: viewer.id,
        },
      },
    });

    expect(membership?.role).toBe('VIEWER');

    await request(app.getHttpServer())
      .patch(`${base}/${workspaceId}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ name: 'Not Allowed' })
      .expect(403);
  });

  it('rejects invitations accepted by another email', async () => {
    const owner = await createAccount();
    const invited = await createAccount();
    const stranger = await createAccount();

    const workspaceId =
      await createWorkspace(owner.token);

    const response = await request(app.getHttpServer())
      .post(`${base}/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: invited.email,
        role: 'EDITOR',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base}/invitations/accept`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({
        token: response.body.invitationToken,
      })
      .expect(403);
  });

  it('prevents removing the workspace owner', async () => {
    const owner = await createAccount();

    const workspaceId =
      await createWorkspace(owner.token);

    await request(app.getHttpServer())
      .delete(`${base}/${workspaceId}/members/${owner.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(409);
  });

  it('prevents changing roles across workspaces', async () => {
    const owner = await createAccount();
    const member = await createAccount();

    const firstWorkspace =
      await createWorkspace(owner.token);

    const secondWorkspace =
      await createWorkspace(owner.token);

    await inviteAndJoin(
      firstWorkspace,
      owner.token,
      member,
    );

    await request(app.getHttpServer())
      .patch(`${base}/${secondWorkspace}/members/${member.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'EDITOR' })
      .expect(404);
  });

  it('rejects an invalid workspace ID', async () => {
    const user = await createAccount();

    await request(app.getHttpServer())
      .get(`${base}/invalid-id`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);
  });
});
