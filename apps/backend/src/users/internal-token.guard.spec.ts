import { InternalTokenGuard } from "./internal-token.guard";

interface MockRequest {
  headers: Record<string, string | undefined>;
}

function makeContext(req: MockRequest) {
  return { switchToHttp: () => ({ getRequest: () => req }) };
}

describe("InternalTokenGuard", () => {
  const OLD_ENV = process.env;
  let guard: InternalTokenGuard;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.INTERNAL_SERVICE_TOKEN;
    guard = new InternalTokenGuard();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("allows a request presenting the correct X-Internal-Token", () => {
    process.env.INTERNAL_SERVICE_TOKEN = "shared-secret";
    const ctx = makeContext({ headers: { "x-internal-token": "shared-secret" } });
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it("rejects a wrong token", () => {
    process.env.INTERNAL_SERVICE_TOKEN = "shared-secret";
    const ctx = makeContext({ headers: { "x-internal-token": "wrong" } });
    expect(() => guard.canActivate(ctx as never)).toThrow();
  });

  it("rejects a request without the header", () => {
    process.env.INTERNAL_SERVICE_TOKEN = "shared-secret";
    const ctx = makeContext({ headers: {} });
    expect(() => guard.canActivate(ctx as never)).toThrow();
  });

  it("rejects everything when no token is configured", () => {
    const ctx = makeContext({ headers: { "x-internal-token": "anything" } });
    expect(() => guard.canActivate(ctx as never)).toThrow();
  });
});
