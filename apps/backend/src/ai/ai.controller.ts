import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { RateLimitGuard } from "../common/rate-limit.guard";

@Controller("ai")
@UseGuards(new RateLimitGuard(20, 60))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("describe-product")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  describeProduct(
    @Body() body: { name: string; category: string; condition: string; keywords?: string },
  ) {
    return this.aiService.generateProductDescription(body.name, body.category, body.condition, body.keywords);
  }

  @Post("resume/improve-summary")
  @UseGuards(AuthGuard("jwt"))
  improveSummary(@Body() body: { summary: string; targetRole?: string }) {
    return this.aiService.improveResumeSummary(body.summary, body.targetRole);
  }

  @Post("resume/improve-experience")
  @UseGuards(AuthGuard("jwt"))
  improveExperience(@Body() body: { description: string; position: string; company: string }) {
    return this.aiService.improveExperienceDescription(body.description, body.position, body.company);
  }

  @Post("resume/cover-letter")
  @UseGuards(AuthGuard("jwt"))
  coverLetter(
    @Body() body: { fullName: string; targetRole: string; company: string; skills: string[]; experience: string },
  ) {
    return this.aiService.generateCoverLetter(body.fullName, body.targetRole, body.company, body.skills, body.experience);
  }
}