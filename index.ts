import { EventEmitter } from 'events'

import {
  PlectimusConfig,
  PlectimusMessage,
  PlectimusOptions,
  PlectimusResponse,
  PlectimusDriver
} from './types'

import { createTomlPrompt, parseToml } from './toml'

import {
  GPT316KDriver,
  GPT3Driver,
  GPT4Driver
} from './openai'

export {
  PlectimusConfig,
  PlectimusMessage,
  PlectimusOption,
  PlectimusOptions,
  PlectimusResponse,
  PlectimusTextDriver,
  PlectimusRawDriver,
  PlectimusDriver
} from './types'

export {
  GPT3Driver,
  GPT316KDriver,
  GPT4Driver
} from './openai'

const namedDrivers = {
  'gpt-3.5': GPT3Driver,
  'gpt-3.5-16k': GPT316KDriver,
  'gpt-4': GPT4Driver
}

export class Plectimus extends EventEmitter {
  driver: PlectimusDriver
  apiKey: string

  constructor (options: {
    driver: PlectimusDriver | keyof typeof namedDrivers
    apiKey?: string
  }) {
    super()

    if (typeof options.driver === 'string') {
      const Driver = namedDrivers[options.driver]
      if (Driver === undefined) throw new Error(`Unknown driver: ${options.driver}`)
      this.driver = new Driver()
    } else {
      this.driver = options.driver
    }

    this.driver.onTokenUse((prompt, completion) => {
      this.emit('tokenUse', { prompt, completion, total: prompt + completion })
    })

    this.apiKey = options.apiKey ?? ''
  }

  public async test (): Promise<void> {
    if (this.driver.testApiKey != null) await this.driver.testApiKey(this.apiKey)
  }

  public async send <S extends string>(messages: PlectimusMessage[], options: PlectimusOptions<S>, config?: PlectimusConfig): Promise<PlectimusResponse<S>>
  public async send <S extends string>(systemMessage: string, userMessage: string, options: PlectimusOptions<S>, config?: PlectimusConfig): Promise<PlectimusResponse<S>>
  public async send (...args: any[]): Promise<any> {
    let messages: PlectimusMessage[]
    let options: PlectimusOptions<string>
    let config: PlectimusConfig

    if (typeof args[0] === 'string') {
      messages = [{
        role: 'system',
        content: args[0]
      }, {
        role: 'user',
        content: args[1]
      }]
      options = args[2]
      config = args[3] ?? {}
    } else {
      messages = args[0]
      options = args[1]
      config = args[2] ?? {}
    }

    if (this.apiKey !== '') config.apiKey = this.apiKey

    let result: PlectimusResponse<string>

    if (this.driver.mode === 'text') {
      const tomlPrompt = createTomlPrompt(options)
      const promptMessages: PlectimusMessage[] = [
        ...messages,
        {
          role: 'system',
          content: tomlPrompt
        }
      ]

      this.emit('text-prompt-sent', tomlPrompt)
      this.emit('text-prompt-logs', `===\nSEND\n---\n${promptMessages.map(message => `${message.role}\n---\n${message.content}`).join('\n---\n')}\n===`)

      const response = await this.driver.send(promptMessages, config)

      this.emit('text-prompt-received', response)
      this.emit('text-prompt-logs', `===\nRECEIVE\n---\n${response}\n===`)

      result = parseToml(response)
    } else {
      result = await this.driver.send(messages, options, config)
    }

    // validate result
    const selections = options.map((option) => option.selection)
    const option = options.find((option) => option.selection === result.selection)

    if (!selections.includes(result.selection) || option === undefined) {
      throw new Error(`Invalid selection: ${result.selection} (possible options: ${selections.join(', ')})`)
    }

    const params = option.params
    const data = result.data

    if (params !== undefined) {
      const paramKeys = Object.keys(params)

      for (const paramKey of paramKeys) {
        if (data[paramKey] === undefined) {
          throw new Error(`Missing param: ${paramKey}`)
        }

        const param = params[paramKey]
        const value = data[paramKey]

        if (param.type === 'string' || param.type === 'multiline') {
          if (typeof value !== 'string') {
            throw new Error(`Invalid param type: ${paramKey} (expected: ${param.type as string}, got: ${typeof value})`)
          }
        }

        if (param.type === 'number') {
          const converted = Number(value)
          if (typeof value !== 'number' && Number.isNaN(converted)) { // why is this type cast required, wth
            throw new Error(`Invalid param type: ${paramKey} (expected: ${param.type as string}, got: ${typeof value})`)
          }
          if (converted !== value) data[paramKey] = converted
        }

        if (param.type === 'boolean') {
          const boolMap: Record<string, boolean> = { true: true, false: false }
          const converted = boolMap[value]
          if (typeof value !== 'boolean' && converted === undefined) {
            throw new Error(`Invalid param type: ${paramKey} (expected: ${param.type as string}, got: ${typeof value})`)
          }
          if (converted !== value) data[paramKey] = converted
        }

        if (param.type === 'array') { // specifically an array of strings
          if (!Array.isArray(value)) {
            throw new Error(`Invalid param type: ${paramKey} (expected: ${param.type as string}, got: ${typeof value})`)
          }

          for (const item of value) {
            if (typeof item !== 'string') {
              throw new Error(`Invalid param type: ${paramKey} (expected: string (as array element), got: ${typeof value})`)
            }
          }
        }
      }
    }

    for (const dataKey of Object.keys(data)) {
      if (params === undefined || params[dataKey] === undefined) {
        throw new Error(`Invalid or extraneous param: ${dataKey}`)
      }
    }

    return result
  }
}
