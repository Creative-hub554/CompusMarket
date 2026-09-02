import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthController", () => {
  let controller: HealthController;

  const mockPrisma = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Deterministic env: no Redis/Meili/MinIO configured, so only DB decides for
    // the readiness + summary status.
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("MEILI_HOST", "");
    vi.stubEnv("MINIO_ACCESS_KEY", "");
    vi.stubEnv("MINIO_SECRET_KEY", "");

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("live", () => {
    it("returns ok without touching dependencies", () => {
      expect(controller.live()).toEqual({ status: "ok" });
    });
  });

  describe("ready", () => {
    it("returns ok when the database is reachable", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      const result = await controller.ready();
      expect(result.status).toBe("ok");
      expect(result.checks.db).toBe("up");
    });

    it("throws 503 when the database is down", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("connection refused"));
      await expect(controller.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe("check", () => {
    it("reports ok when all required services are up", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      const result = await controller.check();
      expect(result.status).toBe("ok");
      expect(result.checks.db.status).toBe("up");
      expect(result.checks.redis.status).toBe("up");
      expect(result.checks.meilisearch.status).toBe("up");
      expect(result.checks.minio.status).toBe("up");
      expect(typeof result.uptime).toBe("number");
    });

    it("reports degraded when the database is down", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("down"));
      const result = await controller.check();
      expect(result.status).toBe("degraded");
      expect(result.checks.db.status).toBe("down");
      expect(result.checks.db.error).toBeDefined();
    });
  });
});
