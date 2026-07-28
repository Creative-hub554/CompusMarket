import { Controller, Post, Body, UsePipes, ValidationPipe, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RateLimitGuard } from "../common/rate-limit.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
@UseGuards(new RateLimitGuard(10, 60))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }
}
