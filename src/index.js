import "dotenv/config";
import { Client } from "discord.js-selfbot-v13";
import { isDone, markDone } from "./store.js";
import { collectImageUrls, normalizeForPinterest } from "./images.js";
import { createPin } from "./pinterest.js";

// .env: DISCORD_TOKEN = user token (selfbot), DISCORD_CHANNEL_ID, Pinterest bilgileri
const { DISCORD_TOKEN, DISCORD_CHANNEL_ID, PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID || !PINTEREST_ACCESS_TOKEN || !PINTEREST_BOARD_ID) {
  console.error("Eksik .env: DISCORD_TOKEN, DISCORD_CHANNEL_ID, PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID gerekli");
  process.exit(1);
}

const client = new Client({ checkUpdate: false });

async function handleMessage(message) {
  const channelId = message.channelId || message.channel?.id;
  if (channelId !== DISCORD_CHANNEL_ID) return;
  if (message.author && message.author.id === client.user?.id && message.attachments.size === 0 && message.embeds.length === 0) return;
  const images = collectImageUrls(message);
  for (const img of images) {
    const key = `${message.id}:${img.id}`;
    if (isDone(key)) continue;
    try {
      const dl = await fetch(img.url);
      if (!dl.ok) throw new Error(`indirilemedi ${dl.status}`);
      const raw = Buffer.from(await dl.arrayBuffer());
      const { buffer, filename, mime } = await normalizeForPinterest(raw, img.name);

      await createPin({
        token: PINTEREST_ACCESS_TOKEN,
        boardId: PINTEREST_BOARD_ID,
        title: filename,
        description: `${process.env.PINTEREST_DESCRIPTION_PREFIX || ""} discord:${message.id}`.trim(),
        base64: buffer.toString("base64"),
        contentType: mime,
      });

      markDone(key);
      console.log(`OK -> ${filename} (${message.id})`);
      await new Promise((r) => setTimeout(r, 2000)); // Pinterest rate-limit korumasi
    } catch (e) {
      console.error(`HATA ${message.id} ${img.url}:`, e.message);
    }
  }
}

async function backfill(channel) {
  console.log("Eski fotolar taraniyor...");
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
  const channel = await client.channels.fetch(DISCORD_CHANNEL_ID).catch(() => null);
  if (!channel?.messages) {
    console.error("Kanal bulunamadi. ID'yi ve hesabın kanala erişimini kontrol et.");
    process.exit(1);
  }
  await backfill(channel);
  if (process.env.BACKFILL_ONLY === "1") {
    console.log("BACKFILL_ONLY=1, cikiliyor.");
    process.exit(0);
  }
  console.log("Yeni mesajlar dinleniyor...");
});

client.on("messageCreate", handleMessage);

client.login(DISCORD_TOKEN);
