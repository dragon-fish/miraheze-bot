import { resolve } from 'node:path'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { useDirname } from '@/utils/dir'
import { Context, Service } from 'cordis'
import { fileTypeFromBuffer } from 'file-type'
import PQueue from 'p-queue'
import { pathToFileURL } from 'node:url'
import { File } from '@web-std/file'
import { MwApi } from 'wiki-saikou'
import { sleep } from '@/utils/sleep'
import { SingleBar, Presets } from 'cli-progress'
import { LogFile } from '@/utils/log'

const __dirname = useDirname(import.meta.url)

declare module 'cordis' {
  interface Context {
    filesManager: FilesManagerService
  }
}

export interface MwImageInfo {
  name: string
  timestamp: string
  url: string
  descriptionurl: string
  descriptionshorturl: string
  ns: number
  title: string
}

export default class FilesManagerService extends Service {
  static inject = ['mw']
  static __dirname = __dirname
  readonly __dirname = __dirname

  constructor(public ctx: Context) {
    super(ctx, 'filesManager', false)
  }

  // Upload
  async getUploadFileList() {
    const list = await readdir(resolve(__dirname, './upload'))
    return list.filter((file) => {
      return !file.startsWith('.')
    })
  }

  async batchUpload(filePaths: string[], concurrency: number = 5) {
    const log = new LogFile(resolve(__dirname, './upload.log'))
    const queue = new PQueue({ concurrency })
    const total = filePaths.length
    let finishedIndex = new Set<number>()
    const bar = new SingleBar({}, Presets.shades_classic)
    bar.start(total, 0)
    log.addLine(`=========== BATCH UPLOAD ===========`)

    queue.addAll(
      filePaths.map((path, i) => async () => {
        const file = await this.readFileAsFile(path)
        await this.ctx.mw.api
          .upload(file.name, file, '[TASK] batch sync from source wiki', {
            ignorewarnings: 1,
          })
          .then((res) => {
            log.addLine(`${file.name} uploaded`)
          })
          .catch((e) => {
            log.addLine(`${file.name} FAILED:`, e.message || e)
          })
        finishedIndex.add(i)
        bar.increment(1)
        await sleep(1000)
      })
    )

    await queue.onIdle()
    bar.stop()

    const failed = filePaths.filter((_, i) => !finishedIndex.has(i))

    return {
      finished: finishedIndex.size,
      failed,
    }
  }

  async autoUploadAll(continueFrom?: string) {
    const fileNames = await this.getUploadFileList()
    const continueIndex = fileNames.findIndex((name) => name === continueFrom)
    const startIndex = continueIndex === -1 ? 0 : continueIndex
    if (startIndex > 0) {
      this.ctx.logger.info(
        `[FilesManagerService] continue from:`,
        continueFrom,
        startIndex
      )
    }
    const filePaths = fileNames
      .slice(startIndex)
      .map((name) => resolve(__dirname, `./upload/${name}`))
    return await this.batchUpload(filePaths)
  }

  // Download
  async downloadFromUrl(url: string, fileName: string, site?: string) {
    // make file name safly for the Windows system
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '_')
    const buf = await fetch(url).then((res) => res.arrayBuffer())
    const nodeBuf = Buffer.from(buf)
    return writeFile(
      resolve(__dirname, `./download/${site ? site + '/' : ''}${fileName}`),
      nodeBuf
    )
  }

  async getAllFileInfoFromWiki(api: MwApi, aicontinue?: string) {
    const list: MwImageInfo[] = []

    const loopFetch = async (aicontinue?: string) => {
      const { data } = await api.get<{
        continue?: { aicontinue: string }
        query: { allimages: MwImageInfo[] }
      }>({
        action: 'query',
        list: 'allimages',
        aifrom: aicontinue,
        ailimit: 'max',
      })
      list.push(...data.query.allimages)
      if (data.continue) {
        await sleep(1000)
        return await loopFetch(data.continue.aicontinue)
      }
    }
    await loopFetch(aicontinue)

    return list
  }

  async batchDownloadFiles(
    fileList: MwImageInfo[],
    concurrency: number = 5,
    site?: string
  ) {
    const queue = new PQueue({ concurrency })
    const total = fileList.length
    let finishedIndex = new Set<number>()
    const bar = new SingleBar({}, Presets.shades_classic)
    bar.start(total, 0)

    queue.addAll(
      fileList.map((file, i) => async () => {
        await this.downloadFromUrl(file.url, file.name, site)
        finishedIndex.add(i)
        bar.increment(1)
        await sleep(1000)
      })
    )

    await queue.onIdle()
    bar.stop()

    const failed = fileList.filter((_, i) => !finishedIndex.has(i))

    return {
      finished: finishedIndex.size,
      failed,
    }
  }

  async autoDownloadAll(api: MwApi) {
    const hostname = new URL(api.baseURL.value).hostname
    const fileList = await this.getAllFileInfoFromWiki(api)
    try {
      mkdir(resolve(__dirname, `./download/${hostname}`), { recursive: true })
    } catch (e) {}
    return await this.batchDownloadFiles(fileList, 5, hostname)
  }

  // Utils
  async readFileAsFile(path: string) {
    const buf = await readFile(path)
    const url = pathToFileURL(path)
    let fileName = url.pathname.split('/').pop()!
    const { mime, ext } = await fileTypeFromBuffer(buf)

    if (ext && !fileName.endsWith(ext)) {
      fileName = fileName.replace(/\.\w+$/, `.${ext}`)
    }

    const file = new File([buf], fileName, { type: mime })

    return file
  }

  getFileSafeName(path: string, blob: Blob) {}
}
