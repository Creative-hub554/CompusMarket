import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { RateLimitGuard } from "../common/rate-limit.guard";
import { CreateAssistantProductDto } from "./dto/create-assistant-product.dto";
import { CreateAssistantCareerDto } from "./dto/create-assistant-career.dto";

@Controller("ai")
@UseGuards(new RateLimitGuard(20, 60))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("assistant/products")
  @UseGuards(AuthGuard("jwt"))
  async assistantProducts(
    @Body() body: CreateAssistantProductDto
  ) {
    const { message, lang } = body;
    const spec = await this.aiService.extractSearchSpec(message, lang);
    if (spec) {
      const reply = await this.aiService.generateAssistantResponse(message, lang);
      return { reply, searchSpec: spec };
    } else {
      const reply = await this.aiService.generateAssistantResponse(message, lang);
      return { reply };
    }
  }

  @Post("assistant/careers")
  @UseGuards(AuthGuard("jwt"))
  async assistantCareers(
    @Body() body: CreateAssistantCareerDto
  ) {
    const { message, lang } = body;
    const result = await this.aiService.extractCareerMatch(message, lang);
    return result;
  }

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