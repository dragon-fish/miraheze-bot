import { Context, Service } from 'cordis'
import { MwApi, MwApiParams } from 'wiki-saikou'

declare module 'cordis' {
  interface Context {
    mw: MediaWikiService
  }
}

export class MediaWikiService extends Service {
  public readonly api: MwBot
  public readonly userInfo!: UnPromisify<ReturnType<MwBot['getUserInfo']>>

  constructor(
    public ctx: Context,
    readonly options: {
      endpoint: string
      username: string
      password: string
    }
  ) {
    if (!options.endpoint) {
      throw new Error('No MediaWiki API endpoint provided')
    }

    super(ctx, 'mw', false)
    this.api = new MwBot(options.endpoint, {
      query: {
        bot: true,
      },
    })
  }

  protected async start() {
    if (this.options.username && this.options.password) {
      await this.api.login(
        process.env.MW_BOT_USERNAME!,
        process.env.MW_BOT_PASSWORD!
      )
    }

    Object.defineProperty(this, 'userInfo', {
      value: await this.api.getUserInfo(),
      writable: false,
    })

    this.ctx.logger.info(
      `[MediaWikiService] run as:`,
      `${this.userInfo.name} (${this.userInfo.id})`
    )
  }
}

export class MwBot extends MwApi {
  async edit(
    title: string,
    text: string,
    summary?: string,
    params?: MwApiParams
  ): Promise<MwEditResult> {
    const { data } = await this.postWithToken<{
      edit: MwEditResult
    }>('csrf', {
      ...params,
      action: 'edit',
      title,
      text,
      summary,
    })

    return data.edit
  }

  async upload(
    name: string,
    file: Blob,
    comment?: string,
    params?: MwApiParams
  ) {
    const form = new FormData()
    if (params) {
      for (const key in params) {
        form.append(key, params[key] as string)
      }
    }
    form.append('action', 'upload')
    form.append('filename', name)
    form.append('file', file)
    form.append('comment', comment)
    form.append('token', await this.token('csrf'))

    const { data } = await this.request.post<any>('', form)
    return data
  }
}

type UnPromisify<T> = T extends Promise<infer U> ? U : T
export interface MwEditResult {
  result: 'Success'
  pageid: string
  title: string
  contentmodel: string
  oldrevid: number
  newrevid: number
  newtimestamp: string
  watched: boolean
}
