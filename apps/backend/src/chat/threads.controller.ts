import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsArray, IsOptional, IsString } from "class-validator";
import { ThreadsService } from "./threads.service";
import { parseLimit } from "../common/pagination";

class CreateThreadDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

class SyncContactsDto {
  @IsArray()
  @IsString({ each: true })
  contacts!: string[];
}

type AuthUser = { user: { userId: string } };

@Controller("threads")
@UseGuards(AuthGuard("jwt"))
export class ThreadsController {
  constructor(private threads: ThreadsService) {}

  @Get()
  list(@Req() req: AuthUser) {
    return this.threads.listThreads(req.user.userId);
  }

  @Get("online")
  online(@Req() req: AuthUser) {
    return this.threads.listOnlineContacts(req.user.userId);
  }

  /** Id of the built-in @champeybot account (created on first call). */
  @Get("bot")
  async bot() {
    return { id: await this.threads.getBotUserId() };
  }

  /** Telegram-style contact sync — match a pasted list against registered users. */
  @Post("contacts/sync")
  syncContacts(@Req() req: AuthUser, @Body() dto: SyncContactsDto) {
    return this.threads.syncContacts(req.user.userId, dto.contacts ?? []);
  }

  @Post()
  async create(@Req() req: AuthUser, @Body() dto: CreateThreadDto) {
    let targetId = dto.userId;
    if (!targetId && dto.sellerId) {
      targetId = await this.threads.resolveSellerUserId(dto.sellerId);
    }
    if (!targetId) {
      return this.threads.listThreads(req.user.userId);
    }
    const id = await this.threads.findOrCreateThread(req.user.userId, targetId, dto.productId);
    return { id };
  }

  @Get(":id/messages")
  messages(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.threads.getMessages(id, req.user.userId, cursor, limit ? parseLimit(limit, 30) : undefined);
  }

  @Post(":id/read")
  async markRead(@Req() req: AuthUser, @Param("id") id: string) {
    await this.threads.markRead(id, req.user.userId);
    return { ok: true };
  }
}
