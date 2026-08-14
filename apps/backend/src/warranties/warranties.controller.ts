import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { WarrantiesService } from "./warranties.service";
import { CreateWarrantyDto } from "./dto/create-warranty.dto";
import { ClaimWarrantyDto } from "./dto/claim-warranty.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Request } from "express";

@Controller("warranties")
export class WarrantiesController {
  constructor(private readonly warrantiesService: WarrantiesService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  create(@Body() dto: CreateWarrantyDto) {
    return this.warrantiesService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  findAll() {
    return this.warrantiesService.findAll();
  }

  @Get("stats")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  stats() {
    return this.warrantiesService.getStats();
  }

  @Get("my")
  @UseGuards(AuthGuard("jwt"))
  myWarranties(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.warrantiesService.findByUser(user.userId);
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  findOne(@Param("id") id: string, @Req() req: Request) {
    const user = req.user as { userId: string; role: string };
    return this.warrantiesService.findOne(id, user);
  }

  @Get("product/:productId")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  findByProduct(@Param("productId") productId: string) {
    return this.warrantiesService.findByProduct(productId);
  }

  @Post(":id/claim")
  @UseGuards(AuthGuard("jwt"))
  claim(@Param("id") id: string, @Req() req: Request, @Body() dto: ClaimWarrantyDto) {
    const user = req.user as { userId: string };
    return this.warrantiesService.claim(id, user.userId, dto);
  }

  @Patch(":id/approve")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  approveClaim(@Param("id") id: string) {
    return this.warrantiesService.approveClaim(id);
  }

  @Patch(":id/reject")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  rejectClaim(@Param("id") id: string) {
    return this.warrantiesService.rejectClaim(id);
  }

  @Patch(":id/notes")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  updateNotes(@Param("id") id: string, @Body("notes") notes: string) {
    return this.warrantiesService.updateNotes(id, notes);
  }
}
