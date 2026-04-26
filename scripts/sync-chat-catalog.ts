import { seedDefaultChatEmojis, syncChatGifsFromKlipy } from '@/lib/chat/catalogSync'

async function main() {
  const gifs = await syncChatGifsFromKlipy({
    queries: ['touchdown', 'celebration', 'hype', 'facepalm', 'laughing'],
    perPage: 20,
    pages: 1,
  })

  const emojis = await seedDefaultChatEmojis()

  console.log(
    JSON.stringify(
      {
        ok: true,
        gifs,
        emojis,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('[sync-chat-catalog] failed', error)
  process.exit(1)
})
