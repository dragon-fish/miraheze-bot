import app from '@/index'
import FilesManagerService from '@/plugins/files-manager'

// Run tasks
app.plugin(FilesManagerService)

app.inject(['mw', 'filesManager'], async (ctx) => {
  const manager = ctx.filesManager
  const result = await manager.autoUploadAll()
  ctx.logger.info(`[TASK] batch upload files`, result)
})
