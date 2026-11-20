
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import type { Request } from 'express';

import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';

import type {
  AuthenticatedRequest,
} from './types/auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // REGISTER
  @Throttle({
    default: {
      limit: 20,
      ttl: 60000,
    },
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // LOGIN
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  @Header('Cache-Control', 'no-store')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ) {
    return this.authService.login(dto, {
      userAgent: request.get('user-agent'),
      ipAddress: request.ip,
    });
  }

  // REFRESH TOKEN
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  @Header('Cache-Control', 'no-store')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(
      dto.refreshToken,
    );
  }

  // LOGOUT
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  logout(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.logout(
      request.user.sub,
      request.user.sid,
    );
  }

  // GET AUTHENTICATED USER
  @Get('me')
  @UseGuards(AccessTokenGuard)
  getMe(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.getMe(
      request.user.sub,
    );
  }

  // LIST ACTIVE SESSIONS
  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  getSessions(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.getSessions(
      request.user.sub,
      request.user.sid,
    );
  }

  // REVOKE A SESSION
  @Delete('sessions/:id')
  @UseGuards(AccessTokenGuard)
  revokeSession(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe)
    sessionId: string,
  ) {
    return this.authService.revokeSession(
      request.user.sub,
      sessionId,
    );
  }
}
