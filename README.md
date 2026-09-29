# crowneswensia discord mirror

Discord kanalındaki fotoğrafları Pinterest panosuna otomatik kopyalar.
`discord.js-selfbot-v13` kullanır: önce eski fotoğrafları tarar (backfill), sonra yenileri dinler.

## Kurulum

```bash
npm install
cp .env.example .env
node src/index.js
```

## Ayarlar (.env)

```
DISCORD_TOKEN=
DISCORD_CHANNEL_ID=
PINTEREST_ACCESS_TOKEN=
PINTEREST_BOARD_ID=
```

## Site

https://github.com/crowneswensia/discord-pinterest-mirror

## Gizlilik

Bakınız [PRIVACY.md](./PRIVACY.md)
