// OpenAI GPT drivers

import axios from 'axios'

import { PlectimusConfig, PlectimusMessage, PlectimusTextDriver } from './types'

class GptTextDriver implements PlectimusTextDriver {
  private readonly defaultModel: string
  private readonly endpoint: string

  public readonly mode = 'text'

  constructor (defaultModel: string, endpoint?: string) {
    this.defaultModel = defaultModel
    this.endpoint = endpoint ?? 'https://api.openai.com/v1/'
  }

  public async send (messages: PlectimusMessage[], config: PlectimusConfig): Promise<string> {
    if (config.apiKey == null) throw new Error('OpenAI API key is required')

    const model = config.modelOverride ?? this.defaultModel
    const params = {
      model,
      messages,
      max_tokens: config.maxTokens ?? 500,
      temperature: config.temperature ?? 1
    }
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }

    const url = new URL('chat/completions', this.endpoint)
    const response = await axios.post(url.href, params, { headers })

    setTimeout(() => {
      this.tokenCounterCallbacks.forEach(callback => callback(response.data.usage.prompt_tokens, response.data.usage.completion_tokens))
    })

    return response.data.choices[0].message.content
  }

  private readonly tokenCounterCallbacks: Array<(prompt: number, completion: number) => void> = []

  public onTokenUse (callback: (prompt: number, completion: number) => void): void {
    this.tokenCounterCallbacks.push(callback)
  }

  public async testApiKey (apiKey: string): Promise<void> {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }

    const url = new URL('models', this.endpoint)
    const response = await axios.get(url.href, { headers })

    if (response.status !== 200) throw new Error('Invalid API key')
  }
}

export class GPT3Driver extends GptTextDriver {
  constructor () {
    super('gpt-3.5-turbo')
  }
}

export class GPT316KDriver extends GptTextDriver {
  constructor () {
    super('gpt-3.5-turbo-16k')
  }
}

export class GPT4Driver extends GptTextDriver {
  constructor () {
    super('gpt-4')
  }
}

// todo create a gpt functional driver using the raw driver syntax
