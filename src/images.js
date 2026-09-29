import sharp from "sharp";

// Pinterest JPEG/PNG istiyor, WebP'yi otomatik PNG'ye cevir.
// true donerse buffer Pinterest'e gonderilmeye hazir, contentType guncellenir.
export async function normalizeForPinterest(inputBuffer, originalName = "image") {
  const img = sharp(inputBuffer);
  const meta = await img.metadata().catch(() => ({}));

  // WebP veya transparency sorunlu format -> PNG
  if (meta.format === "webp" || originalName.toLowerCase().endsWith(".webp")) {
    const out = await sharp(inputBuffer).png().toBuffer();
    return { buffer: out, filename: originalName.replace(/\.webp$/i, ".png"), mime: "image/png" };
  }

  // GIF'in ilk karesini al (hareketli pin istemiyorsan)
  if (meta.format === "gif") {
    const out = await sharp(inputBuffer, { animated: false }).png().toBuffer();
    return { buffer: out, filename: originalName.replace(/\.gif$/i, ".png"), mime: "image/png" };
  }

  // JPEG/PNG ise oldugu gibi birak
  const mime = meta.format === "png" ? "image/png" : "image/jpeg";
  return { buffer: inputBuffer, filename: originalName, mime };
}

export function collectImageUrls(message) {
  const out = [];
  for (const att of message.attachments.values()) {
    const ct = att.contentType || "";
    const url = att.url || "";
    if (ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) {
      out.push({ url, name: att.name || "image", id: att.id });
    }
  }
  for (const e of message.embeds) {
    if (e.image?.url) out.push({ url: e.image.url, name: "embed.jpg", id: e.image.url });
    else if (e.thumbnail?.url) out.push({ url: e.thumbnail.url, name: "thumb.jpg", id: e.thumbnail.url });
  }
  return out;
}
