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
      await c.init();
      const ok = await c.login(PINTEREST_EMAIL, PINTEREST_PASSWORD);
      if (!ok && !c.isAuthenticated()) throw new Error("Pinterest login basarisiz");
      client = c;
      console.log("Pinterest (free) login OK");
      return client;
    } catch (e) {
      ready = null;
      client = null;
      throw e;
    }
  })();
  return ready;
}

export async function createPinFree({ imageFile, title, description, boardName }) {
  const c = await getFreeClient();
  const ok = await c.createPin({ imageFile, title, description, boardName });
  if (!ok) throw new Error("createPin basarisiz (free)");
  return { ok: true };
}

export async function closeFree() {
  if (client) await client.close().catch(() => {});
}
