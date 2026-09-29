import { PinterestClient } from "pinterest-js-client";

let client = null;
let ready = null;

export async function getFreeClient() {
  if (client) return client;
  if (ready) return ready;
  ready = (async () => {
    const { PINTEREST_EMAIL, PINTEREST_PASSWORD } = process.env;
    if (!PINTEREST_EMAIL || !PINTEREST_PASSWORD) {
      throw new Error("Eksik .env: PINTEREST_EMAIL, PINTEREST_PASSWORD gerekli (free mod)");
    }
    client = new PinterestClient({
      headless: true,
      useFingerprintSuite: true,
      userDataDir: "./.pin-session",
    });
    await client.init();
    const ok = await client.login(PINTEREST_EMAIL, PINTEREST_PASSWORD);
    if (!ok && !client.isAuthenticated()) throw new Error("Pinterest login basarisiz");
    console.log("Pinterest (free) login OK");
    return client;
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
