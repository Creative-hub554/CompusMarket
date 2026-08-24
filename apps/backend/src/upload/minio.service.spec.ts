import { Test, TestingModule } from "@nestjs/testing";
import { MinioService } from "./minio.service";

const bucketExists = vi.hoisted(() => vi.fn());
const makeBucket = vi.hoisted(() => vi.fn());
const putObject = vi.hoisted(() => vi.fn());
const removeObject = vi.hoisted(() => vi.fn());

vi.mock("minio", () => ({
  Client: class {
    bucketExists = bucketExists;
    makeBucket = makeBucket;
    putObject = putObject;
    removeObject = removeObject;
  },
}));

describe("MinioService", () => {
  let service: MinioService;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_USE_SSL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [MinioService],
    }).compile();
    service = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("onModuleInit", () => {
    it("stays unavailable when MinIO credentials are missing", async () => {
      await service.onModuleInit();

      expect(bucketExists).not.toHaveBeenCalled();
      await expect(service.uploadFile(Buffer.from("x"), "f.png", "image/png")).rejects.toThrow(
        "Storage service unavailable",
      );
    });

    it("becomes ready when the bucket already exists", async () => {
      process.env.MINIO_ACCESS_KEY = "key";
      process.env.MINIO_SECRET_KEY = "secret";
      bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(bucketExists).toHaveBeenCalledWith("khmeronlineshopbytheo");
      expect(makeBucket).not.toHaveBeenCalled();
    });

    it("creates the bucket when it does not exist", async () => {
      process.env.MINIO_ACCESS_KEY = "key";
      process.env.MINIO_SECRET_KEY = "secret";
      bucketExists.mockResolvedValue(false);
      makeBucket.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(makeBucket).toHaveBeenCalledWith("khmeronlineshopbytheo");
    });

    it("stays unavailable when MinIO is unreachable", async () => {
      process.env.MINIO_ACCESS_KEY = "key";
      process.env.MINIO_SECRET_KEY = "secret";
      bucketExists.mockRejectedValue(new Error("ECONNREFUSED"));

      await service.onModuleInit();

      await expect(service.uploadFile(Buffer.from("x"), "f.png", "image/png")).rejects.toThrow(
        "Storage service unavailable",
      );
    });
  });

  describe("uploadFile", () => {
    beforeEach(async () => {
      process.env.MINIO_ACCESS_KEY = "key";
      process.env.MINIO_SECRET_KEY = "secret";
      bucketExists.mockResolvedValue(true);
      await service.onModuleInit();
    });

    it("uploads with content type and disposition", async () => {
      putObject.mockResolvedValue(undefined);

      const url = await service.uploadFile(Buffer.from("hello"), "a.png", "image/png", "inline");

      expect(putObject).toHaveBeenCalledWith(
        "khmeronlineshopbytheo",
        "a.png",
        expect.any(Buffer),
        5,
        { "Content-Type": "image/png", "Content-Disposition": "inline" },
      );
      expect(url).toBe("a.png");
    });

    it("defaults the disposition to attachment", async () => {
      putObject.mockResolvedValue(undefined);

      await service.uploadFile(Buffer.from("hello"), "a.png", "image/png");

      expect(putObject).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ "Content-Disposition": "attachment" }),
      );
    });

    it("maps storage failures to a clear error", async () => {
      putObject.mockRejectedValue(new Error("S3 error"));
      await expect(service.uploadFile(Buffer.from("x"), "a.png", "image/png")).rejects.toThrow(
        "Storage service unavailable",
      );
    });
  });

  describe("deleteFile", () => {
    it("removes the object when available", async () => {
      process.env.MINIO_ACCESS_KEY = "key";
      process.env.MINIO_SECRET_KEY = "secret";
      bucketExists.mockResolvedValue(true);
      removeObject.mockResolvedValue(undefined);
      await service.onModuleInit();

      await service.deleteFile("a.png");

      expect(removeObject).toHaveBeenCalledWith("khmeronlineshopbytheo", "a.png");
    });

    it("throws when storage is unavailable", async () => {
      await expect(service.deleteFile("a.png")).rejects.toThrow("Storage service unavailable");
    });
  });

  describe("getFileUrl", () => {
    it("builds an http URL by default", () => {
      expect(service.getFileUrl("a.png")).toBe(
        "http://localhost:9000/khmeronlineshopbytheo/a.png",
      );
    });

    it("builds an https URL when SSL is enabled", () => {
      process.env.MINIO_ENDPOINT = "cdn.example.com";
      process.env.MINIO_PORT = "443";
      process.env.MINIO_USE_SSL = "true";
      expect(service.getFileUrl("a.png")).toBe("https://cdn.example.com:443/khmeronlineshopbytheo/a.png");
    });
  });
});
