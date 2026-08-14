import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { RateLimitGuard } from "../common/rate-limit.guard";
import { DescribeProductDto } from "./dto/describe-product.dto";
import { ImproveSummaryDto } from "./dto/improve-summary.dto";
import { ImproveExperienceDto } from "./dto/improve-experience.dto";
import { CoverLetterDto } from "./dto/cover-letter.dto";

@Controller("ai")
@UseGuards(new RateLimitGuard(20, 60))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("describe-product")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  describeProduct(@Body() body: DescribeProductDto) {
    return this.aiService.generateProductDescription(body.name, body.category, body.condition, body.keywords);
  }

  @Post("resume/improve-summary")
  @UseGuards(AuthGuard("jwt"))
  improveSummary(@Body() body: ImproveSummaryDto) {
    return this.aiService.improveResumeSummary(body.summary, body.targetRole);
  }

  @Post("resume/improve-experience")
  @UseGuards(AuthGuard("jwt"))
  improveExperience(@Body() body: ImproveExperienceDto) {
    return this.aiService.improveExperienceDescription(body.description, body.position, body.company);
  }

  @Post("resume/cover-letter")
  @UseGuards(AuthGuard("jwt"))
  coverLetter(@Body() body: CoverLetterDto) {
    return this.aiService.generateCoverLetter(body.fullName, body.targetRole, body.company, body.skills, body.experience);
  }
}