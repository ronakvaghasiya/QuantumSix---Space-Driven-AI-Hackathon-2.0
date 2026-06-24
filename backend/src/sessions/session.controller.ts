import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SessionService } from './session.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/interfaces/auth-user.interface';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessions: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions for current user' })
  list(@CurrentUser() user: AuthUser) {
    return this.sessions.listForUser(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a session' })
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.sessions.revoke(id, user.id);
    return { ok: true };
  }

  @Post('revoke-others')
  @ApiOperation({ summary: 'Revoke all other sessions' })
  async revokeOthers(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    const count = await this.sessions.revokeAllExcept(user.id, payload.jti || '');
    return { revoked: count };
  }
}
