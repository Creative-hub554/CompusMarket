import { expect, test } from "@playwright/test";

test("cdp exception hunt", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Runtime.enable");
  client.on("Runtime.exceptionThrown", (e) => {
    const d = e.exceptionDetails;
    console.log(
      "EXC>",
      d.text,
      "|",
      d.url ?? "",
      ":",
      d.lineNumber,
      ":",
      d.columnNumber,
      "|",
      (d.exception?.description ?? "").slice(0, 200)
    );
  });

  await page.goto("/en/shop");
  await page.waitForTimeout(4000);
  const link = page.locator('a[href*="/shop/"]').first();
  if (await link.count()) {
    await link.click().catch(() => {});
    await page.waitForTimeout(5000);
  }
  expect(true).toBe(true);
});
