
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

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

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(
      dto.refreshToken,
    );
  }

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

  @Get('me')
  @UseGuards(AccessTokenGuard)
  getMe(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.getMe(
      request.user.sub,
    );
  }

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
