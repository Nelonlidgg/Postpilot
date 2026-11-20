
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

import { SessionsService } from './sessions.service.js';

import {
  generateRefreshToken,
  hashRefreshToken,
  SESSION_TTL_MS,
  ACCESS_TOKEN_TTL,
} from './utils/token.utils.js';

@Injectable()
export class AuthService {
  constructor(
  private readonly usersService: UsersService,
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
  private readonly sessionsService: SessionsService,
) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(
      dto.password,
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    try {
      const user = await this.usersService.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
      });

      return {
        message: 'Account created successfully',
        user,
      };
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }

  async login(
  dto: LoginDto,
  metadata: {
    userAgent?: string;
    ipAddress?: string;
  } = {},
) {
    const user =
      await this.usersService.findByEmail(
        dto.email,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const refreshToken = generateRefreshToken();

   
const session = await this.prisma.session.create({
  data: {
    userId: user.id,
    refreshTokenHash:
      hashRefreshToken(refreshToken),
    expiresAt: new Date(
      Date.now() + SESSION_TTL_MS,
    ),
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
  },
});

    const accessToken =
      await this.signAccessToken(
        user.id,
        session.id,
      );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async getMe(userId: string) {
    const user =
      await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }


async refresh(refreshToken: string) {
  const result =
    await this.sessionsService.rotate(
      refreshToken,
    );

  const accessToken =
    await this.signAccessToken(
      result.userId,
      result.sessionId,
    );

  return {
    accessToken,
    refreshToken: result.refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_TTL,
  };
}

async logout(
  userId: string,
  sessionId: string,
) {
  await this.sessionsService.revoke(
    userId,
    sessionId,
  );

  return {
    message: 'Logged out successfully',
  };
}

async getSessions(
  userId: string,
  currentSessionId: string,
) {
  return this.sessionsService.list(
    userId,
    currentSessionId,
  );
}

async revokeSession(
  userId: string,
  sessionId: string,
) {
  return this.sessionsService.revoke(
    userId,
    sessionId,
  );
}

  private signAccessToken(
    userId: string,
    sessionId: string,
  ) {
    return this.jwtService.signAsync({
      sub: userId,
      sid: sessionId,
    });
  }
}
