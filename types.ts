export interface PlectimusMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PlectimusConfig {
  temperature?: number
  maxTokens?: number
  modelOverride?: string
  apiKey?: string
}

export type Data = Record<string, any>
export type ReturnType = 'string' | 'multiline' | 'number' | 'boolean' | 'array'

export interface PlectimusResponse<S extends string> {
  selection: S
  data: Data
}

export interface PlectimusOption<S extends string> {
  selection: S
  description?: string
  params: Record<string, { type: ReturnType, description: string }>
}

export type PlectimusOptions<S extends string> = Array<PlectimusOption<S>>

export interface PlectimusTextDriver {
  mode: 'text'
  send: (messages: PlectimusMessage[], config: PlectimusConfig) => Promise<string>
  onTokenUse: (callback: (prompt: number, completion: number) => void) => void
  testApiKey?: (apiKey: string) => Promise<void>
}

export interface PlectimusRawDriver {
  mode: 'raw'
  send: <S extends string>(messages: PlectimusMessage[], options: PlectimusOptions<S>, config: PlectimusConfig) => Promise<PlectimusResponse<S>>
  onTokenUse: (callback: (prompt: number, completion: number) => void) => void
  testApiKey?: (apiKey: string) => Promise<void>
}

export type PlectimusDriver = PlectimusTextDriver | PlectimusRawDriver
