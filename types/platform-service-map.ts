export type PlatformProduct = 'shared' | 'bracket' | 'webapp' | 'legacy'

export type PlatformServiceDefinition = {
  key: string
  name: string
  product: PlatformProduct
  responsibility: string
  endpoints: string[]
}

export type PlatformServiceMap = {
  generatedAt: string
  sharedServices: PlatformServiceDefinition[]
  bracketServices: PlatformServiceDefinition[]
  webappServices: PlatformServiceDefinition[]
  legacyServices: PlatformServiceDefinition[]
}
