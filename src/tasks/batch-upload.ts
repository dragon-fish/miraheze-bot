import app from '@/index'
import FilesManagerService from '@/plugins/files-manager'

// Run tasks
app.plugin(FilesManagerService)

app.inject(['mw', 'filesManager'], async (ctx) => {
  const args = process.argv.slice(2)
  const from = args.join(' ')
  const manager = ctx.filesManager
  const result = await manager.autoUploadAll(from)
  ctx.logger.info(`[TASK] batch upload files`, result)
})
