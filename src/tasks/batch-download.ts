import app from '@/index'
import FilesManagerService from '@/plugins/files-manager'
import { writeFile } from 'node:fs/promises'
import { MwApi } from 'wiki-saikou'

// Run tasks
app.plugin(FilesManagerService)

app.inject(['mw', 'filesManager'], async (ctx) => {
  const manager = ctx.filesManager
  const api = new MwApi('https://no-game-no-life.fandom.com/api.php')
  await manager.autoDownloadAll(api)
})
