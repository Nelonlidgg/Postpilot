
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HealthService } from './health.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrisma = {
    $queryRaw: vi.fn<() => Promise<unknown>>(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new HealthService(
      mockPrisma as unknown as PrismaService,
    );
  });

  it('should return API liveness information', () => {
    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('PostPilot API');
  });

  it('should report a healthy database connection', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      { result: 1 },
    ]);

    const result = await service.getReadiness();

    expect(result.status).toBe('ready');
    expect(result.database).toBe('connected');
  });

  it('should throw an exception when the database is unavailable', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(
      new Error('Database connection failed'),
    );

    await expect(
      service.getReadiness(),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
