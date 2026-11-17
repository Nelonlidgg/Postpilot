
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule =
      await Test.createTestingModule({
        controllers: [AppController],
        providers: [AppService],
      }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the PostPilot welcome message', () => {
      expect(appController.getHello()).toBe(
        'Welcome to the PostPilot API!',
      );
    });
  });
});
