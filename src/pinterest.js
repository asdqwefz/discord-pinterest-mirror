const API = "https://api.pinterest.com/v5";

export async function createPin({ token, boardId, title, description, base64, contentType }) {
  if (process.env.DRY_RUN === "1") {
    console.log(`[DRY_RUN] pin atlanmadi, baslik: ${title}`);
    return { id: "dry-run" };
  }

  const res = await fetch(`${API}/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: (title || "Discord").slice(0, 100),
      description: (description || "").slice(0, 800),
      media_source: {
        source_type: "image_base64",
        content_type: contentType,
        data: base64,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Pinterest ${res.status}: ${t}`);
  }
  return res.json();
}
