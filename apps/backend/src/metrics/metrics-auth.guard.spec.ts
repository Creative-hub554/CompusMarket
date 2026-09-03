import { MetricsAuthGuard } from "./metrics-auth.guard";

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: { role: string };
}

interface MockContext {
  req: MockRequest;
  switchToHttp(): { getRequest(): MockRequest };
}

function makeContext(req: MockRequest): MockContext {
  return { req, switchToHttp: () => ({ getRequest: () => req }) };
}

describe("MetricsAuthGuard", () => {
  const OLD_ENV = process.env;
  let guard: MetricsAuthGuard;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.METRICS_TOKEN;
    guard = new MetricsAuthGuard();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("allows a request presenting the correct X-Metrics-Token", async () => {
    process.env.METRICS_TOKEN = "secret-token";
    const req: MockRequest = { headers: { "x-metrics-token": "secret-token" } };
    await expect(guard.canActivate(makeContext(req) as never)).resolves.toBe(true);
    expect(req.user?.role).toBe("METRICS");
  });

  it("allows a request presenting the token via Authorization Bearer", async () => {
    process.env.METRICS_TOKEN = "secret-token";
    const req: MockRequest = { headers: { authorization: "Bearer secret-token" } };
    await expect(guard.canActivate(makeContext(req) as never)).resolves.toBe(true);
  });

  it("rejects a wrong token (does not accept or authorize)", async () => {
    process.env.METRICS_TOKEN = "secret-token";
    const req: MockRequest = { headers: { "x-metrics-token": "wrong" } };
    await expect(guard.canActivate(makeContext(req) as never)).rejects.toThrow();
  });

  it("rejects when no token is configured and no session is present", async () => {
    const req: MockRequest = { headers: {} };
    await expect(guard.canActivate(makeContext(req) as never)).rejects.toThrow();
  });
});
