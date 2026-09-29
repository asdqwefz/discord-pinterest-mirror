import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "discord.js-selfbot-v13";
import { isDone, markDone } from "./store.js";
import { collectImageUrls, normalizeForPinterest } from "./images.js";
import { createPinFree, closeFree, getFreeClient } from "./pinterest-free.js";

// FREE MOD: resmi API yok, email+sifre ile giris. Onay beklemez.
// .env: DISCORD_TOKEN, DISCORD_CHANNEL_ID, PINTEREST_EMAIL, PINTEREST_PASSWORD, PINTEREST_BOARD_NAME
const { DISCORD_TOKEN, DISCORD_CHANNEL_ID, PINTEREST_BOARD_NAME } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID || !PINTEREST_BOARD_NAME) {
  console.error("Eksik .env: DISCORD_TOKEN, DISCORD_CHANNEL_ID, PINTEREST_BOARD_NAME gerekli");
  process.exit(1);
}

const client = new Client({ checkUpdate: false });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pin-"));

async function handleMessage(message) {
  const channelId = message.channelId || message.channel?.id;
  if (channelId !== DISCORD_CHANNEL_ID) return;
  const images = collectImageUrls(message);
  for (const img of images) {
    const key = `${message.id}:${img.id}`;
    if (isDone(key)) continue;
    try {
      const dl = await fetch(img.url);
      if (!dl.ok) throw new Error(`indirilemedi ${dl.status}`);
      const raw = Buffer.from(await dl.arrayBuffer());
      const { buffer, filename } = await normalizeForPinterest(raw, img.name);
      const file = path.join(tmpDir, `${message.id}-${filename.replace(/[^a-z0-9._-]+/gi, "_")}`);
      fs.writeFileSync(file, buffer);

      await createPinFree({
        imageFile: file,
        title: `crownes ${filename}`.slice(0, 100),
        description: `${process.env.PINTEREST_DESCRIPTION_PREFIX || ""} discord:${message.id}`.trim(),
        boardName: PINTEREST_BOARD_NAME,
      });

      markDone(key);
      console.log(`OK(free) -> ${filename} (${message.id})`);
      fs.rmSync(file, { force: true });
      await new Promise((r) => setTimeout(r, 5000)); // ban korumasi: yavas at
    } catch (e) {
      console.error(`HATA ${message.id} ${img.url}:`, e.message);
    }
  }
}

async function backfill(channel) {
  console.log("Eski fotolar taraniyor (free)...");
  let before = undefined;
  let total = 0;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) break;
    const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const m of sorted) await handleMessage(m);
    total += batch.size;
    before = batch.last().id;
    console.log(`tarandi: ${total}`);
    if (batch.size < 100) break;
  }
  console.log(`Backfill bitti: ${total} mesaj`);
}

client.once("ready", async () => {
  console.log(`Selfbot: ${client.user.tag}`);
  try {
    await getFreeClient();
  } catch (e) {
    console.error("Pinterest giris hatasi:", e.message);
    process.exit(1);
  }
  const channel = await client.channels.fetch(DISCORD_CHANNEL_ID).catch(() => null);
  if (!channel?.messages) {
    console.error("Kanal bulunamadi.");
    process.exit(1);
  }
  await backfill(channel);
  if (process.env.BACKFILL_ONLY === "1") {
    await closeFree();
    process.exit(0);
  }
  console.log("Yeni mesajlar dinleniyor (free)...");
});

client.on("messageCreate", handleMessage);
process.on("SIGINT", async () => { await closeFree(); process.exit(0); });

client.login(DISCORD_TOKEN);
