import { Context } from 'cordis'

export default class KeepAlive {
  static inject = ['mw']

  constructor(public ctx: Context) {
    this.ctx.logger.info(`KeepAlive`, 'installed')
    this.start()
  }

  async start() {
    const mw = this.ctx.mw

    const time = new Date().toISOString()
    const summary = `[TASK] scheduled wiki keep-alive`
    const page = `User:${mw.userInfo.name}/keep-alive`

    const { data } = await mw.api.postWithToken('csrf', {
      action: 'edit',
      title: page,
      text: time,
      summary,
    })

    this.ctx.logger.info(`[KeepAlive] successful:`, data)
    return data
  }
}
