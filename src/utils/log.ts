import { writeFile } from 'fs/promises'

export class LogFile {
  constructor(readonly filePath: string) {}

  private safelyStringify(data: any) {
    const walk = new WeakSet()

    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString() + 'n'
      }

      if (typeof value === 'symbol') {
        return value.toString()
      }

      if (typeof value === 'function') {
        return value.toString()
      }

      if (typeof value === 'object' && value !== null) {
        if (walk.has(value)) {
          return '[Circular]'
        }
        walk.add(value)
      }

      return value
    }

    return JSON.stringify(data, replacer, 2)
  }

  private makeLine(...data: any) {
    const time = new Date().toISOString()
    return `[${time}] ${data
      .map((item: any) => {
        if (typeof item === 'object') {
          return this.safelyStringify(item)
        }
        return item
      })
      .join(' ')}`
  }

  addLine(...data: any) {
    return writeFile(this.filePath, this.makeLine(...data) + '\n', {
      flag: 'a',
    })
  }
}
