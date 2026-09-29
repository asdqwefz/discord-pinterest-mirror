import { PinterestClient } from "pinterest-js-client";

let client = null;
let ready = null;

export async function getFreeClient() {
  if (client && client.isAuthenticated()) return client;
  if (ready) return ready;
  ready = (async () => {
    try {
      const { PINTEREST_EMAIL, PINTEREST_PASSWORD } = process.env;
      if (!PINTEREST_EMAIL || !PINTEREST_PASSWORD) {
        throw new Error("Eksik .env: PINTEREST_EMAIL, PINTEREST_PASSWORD gerekli (free mod)");
      }
      const c = new PinterestClient({
        headless: true,
        useFingerprintSuite: false,
        cookiesPath: "./.pin-cookies.json",
      });
      const alreadyIn = await c.init();
      if (alreadyIn || c.isAuthenticated()) {
        console.log("Pinterest (free) session OK (cookie)");
      } else {
        const ok = await c.login(PINTEREST_EMAIL, PINTEREST_PASSWORD).catch(() => false);
        if (!ok && !c.isAuthenticated()) throw new Error("Pinterest login basarisiz");
        console.log("Pinterest (free) login OK");
      }
      client = c;
      return client;
    } catch (e) {
      ready = null;
      client = null;
      throw e;
    }
  })();
  return ready;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Kutuphanenin createPin'i title'da overlay'e takiliyor (click intercept).
// Click yapmadan direkt fill + force uygula.
export async function createPinFree({ imageFile, title, description, boardName }) {
  const c = await getFreeClient();
  const page = c.getPage();
  if (!page) throw new Error("Pinterest sayfasi hazir degil");

  await page.goto("https://www.pinterest.com/pin-builder/", { waitUntil: "domcontentloaded" });
  await sleep(1500);

  if (page.url().includes("/login")) throw new Error("Oturum dusmus, .pin-cookies.json silip tekrar dene");

  const fileInput = 'input[type="file"][data-test-id^="media-upload-input"]';
  await page.waitForSelector(fileInput, { timeout: 15000 });
  await page.setInputFiles(fileInput, imageFile);
  await sleep(2500);

  // Olası overlay/popup kapat
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(500);

  if (title) {
    const titleInput = 'textarea[id^="pin-draft-title"]';
    await page.waitForSelector(titleInput, { timeout: 15000 });
    const loc = page.locator(titleInput).first();
    await loc.fill(title).catch(() => {});
    // fill tutmazsa JS ile dene
    const val = await loc.inputValue().catch(() => "");
    if (!val) {
      await page.evaluate(
        ([sel, t]) => {
          const el = document.querySelector(sel);
          if (el) {
            el.focus();
            document.execCommand("selectAll", false, null);
            document.execCommand("insertText", false, t);
          }
        },
        [titleInput, title]
      );
    }
    await sleep(500);
  }

  if (description) {
    await page.keyboard.press("Tab").catch(() => {});
    await sleep(300);
    await page.keyboard.type(description.slice(0, 800), { delay: 20 }).catch(() => {});
    await sleep(500);
  }

  // Pano sec (isimden bagimsiz: aramada cikan ilk panoya tikla)
  if (boardName) {
    try {
      const btn = '[data-test-id="board-dropdown-select-button"]';
      await page.waitForSelector(`${btn}[aria-disabled="false"]`, { timeout: 15000 });
      await page.locator(btn).first().click({ force: true });
      await sleep(800);
      await page.waitForSelector('[data-test-id="board-picker-flyout"]', { timeout: 8000 });
      await page.fill("#pickerSearchField", boardName);
      await sleep(1500);
      // Once exact test-id dene, olmazsa aramada cikan ilk pano satirina tikla
      const exactBtn = `[data-test-id="board-row-${boardName}"] [data-test-id="board-row-save-button-container"] button`;
      const firstBtn = '[data-test-id="board-picker-flyout"] [data-test-id="board-row-save-button-container"] button';
      let target = null;
      if (await page.locator(exactBtn).first().count()) {
        target = page.locator(exactBtn).first();
      } else {
        await page.waitForSelector(firstBtn, { timeout: 8000 });
        target = page.locator(firstBtn).first();
      }
      await target.click({ force: true });
      await sleep(2500);
      console.log(`Pano secildi: ${boardName}`);
    } catch (e) {
      console.log("Pano secilemedi, varsayilan panoya atiliyor:", e.message?.slice(0, 120));
    }
  }

  const publishBtn = '[data-test-id="board-dropdown-save-button"]';
  await page.waitForSelector(publishBtn, { timeout: 15000 });
  await page.locator(publishBtn).first().click({ force: true });
  await sleep(3000);

  const pinLink = 'a[data-test-id="seeItNow"], a[href*="/pin/"]';
  const found = await page.waitForSelector(pinLink, { timeout: 15000 }).catch(() => null);
  await page.keyboard.press("Escape").catch(() => {});
  if (!found) console.log("Uyari: basari popup'i gorulmedi, pin yine de atilmis olabilir");
  return { ok: true };
}

export async function closeFree() {
  if (client) await client.close().catch(() => {});
}
