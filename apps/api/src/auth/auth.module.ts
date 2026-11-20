
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionsService } from './sessions.service.js';

import { UsersModule } from '../users/users.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

import { AccessTokenGuard } from './guards/access-token.guard.js';
import { ACCESS_TOKEN_TTL } from './utils/token.utils.js';

@Module({
  imports: [
    UsersModule,
    PrismaModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>(
          'JWT_SECRET',
        ),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: ACCESS_TOKEN_TTL,
          issuer: 'postpilot-api',
          audience: 'postpilot-client',
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: 'postpilot-api',
          audience: 'postpilot-client',
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    AccessTokenGuard,
    SessionsService,
  ],

  exports: [
    AuthService,
    AccessTokenGuard,
    JwtModule,
  ],
})
export class AuthModule {}
