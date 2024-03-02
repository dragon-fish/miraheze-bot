import { Context, Service } from 'cordis'
import { MwApi } from 'wiki-saikou'

declare module 'cordis' {
  interface Context {
    mw: MediaWikiService
  }
}

type UnPromisify<T> = T extends Promise<infer U> ? U : T

export class MediaWikiService extends Service {
  public readonly api: MwApi
  public readonly userInfo!: UnPromisify<ReturnType<MwApi['getUserInfo']>>

  constructor(
    public ctx: Context,
    options: {
      endpoint: string
      username: string
      password: string
    }
  ) {
    super(ctx, 'mw', false)
    this.api = new MwApi(options.endpoint, {
      query: {
        bot: true,
      },
    })
  }

  protected async start() {
    await this.api.login(
      process.env.MW_BOT_USERNAME!,
      process.env.MW_BOT_PASSWORD!
    )

    Object.defineProperty(this, 'userInfo', {
      value: await this.api.getUserInfo(),
      writable: false,
    })

    this.ctx.logger.info(
      `[MediaWikiService] Logged in as ${this.userInfo.name} (${this.userInfo.id})`
    )
  }
}
