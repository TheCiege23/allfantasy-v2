import type { AIContextEnvelope, AIModelRole } from '@/lib/unified-ai/types'
import type { ChimmyDeterministicLayer, ChimmyRoutingPlan } from './types'

const DEFAULT_MODEL_ORDER: AIModelRole[] = ['deepseek', 'grok', 'openai']

function uniqModels(models: AIModelRole[]): AIModelRole[] {
  return Array.from(new Set(models))
}

function hasTrendIntent(envelope: AIContextEnvelope): boolean {
  const text = `${envelope.promptIntent ?? ''} ${envelope.userMessage ?? ''}`.toLowerCase()
  return /(trend|news|injur|momentum|recent|breaking|social)/.test(text)
}

function hasQuantIntent(envelope: AIContextEnvelope): boolean {
  const text = `${envelope.featureType ?? ''} ${envelope.promptIntent ?? ''} ${envelope.userMessage ?? ''}`.toLowerCase()
  return /(math|projection|projections|rank|ranking validation|validate ranking|adp|expected value|simulation|probability|scoring)/.test(text)
}

function hasPersonalityIntent(envelope: AIContextEnvelope): boolean {
  const text = `${envelope.promptIntent ?? ''} ${envelope.userMessage ?? ''}`.toLowerCase()
  return /(personality|engagement|tone|hype|banter|narrative|story|social)/.test(text)
}

function hasConsensusIntent(envelope: AIContextEnvelope): boolean {
  const text = `${envelope.promptIntent ?? ''} ${envelope.userMessage ?? ''}`.toLowerCase()
  return /(consensus|compare models|all models|multi-model|cross-model)/.test(text)
}

export function routeChimmyModels(input: {
  envelope: AIContextEnvelope
  deterministicLayer: ChimmyDeterministicLayer
  availableProviders: AIModelRole[]
}): ChimmyRoutingPlan {
  const { envelope, deterministicLayer, availableProviders } = input
  const availableSet = new Set(availableProviders)
  const requestedHints = envelope.modelRoutingHints?.filter((model) => availableSet.has(model)) ?? []

  const wantsQuant = hasQuantIntent(envelope)
  const wantsTone = hasPersonalityIntent(envelope) || hasTrendIntent(envelope)
  const wantsConsensus = hasConsensusIntent(envelope)
  const deterministicThin = deterministicLayer.completenessPct < 60
  const wantsConversational =
    /coach|coaching|chat|explain|explanation|advice|help/i.test(
      `${envelope.promptIntent ?? ''} ${envelope.userMessage ?? ''}`
    )

  let models: AIModelRole[]
  if (requestedHints.length > 0) {
    models = uniqModels(requestedHints)
  } else if (wantsConsensus || (wantsQuant && wantsTone)) {
    models = ['deepseek', 'grok', 'openai']
  } else if (wantsQuant && (wantsConversational || deterministicThin)) {
    models = ['deepseek', 'openai']
  } else if (wantsQuant) {
    models = ['deepseek']
  } else if (wantsTone) {
    models = ['grok']
  } else {
    models = ['openai']
  }

  models = uniqModels(models.filter((model) => availableSet.has(model)))
  if (models.length === 0) models = uniqModels(DEFAULT_MODEL_ORDER.filter((model) => availableSet.has(model)))
  if (models.length === 0) models = ['openai']

  const tasks = models.map((model) => {
    if (model === 'deepseek') {
      return {
        model,
        purpose: 'analysis' as const,
        instruction:
          'Use deterministic projections, matchup context, roster needs, ADP comparison, rankings, and scoring outputs for strict quantitative reasoning.',
      }
    }
    if (model === 'grok') {
      return {
        model,
        purpose: 'trends' as const,
        instruction:
          'Provide trend framing only as advisory context. Do not replace deterministic outputs.',
      }
    }
    return {
      model,
      purpose: 'final_synthesis' as const,
      instruction:
        'Create the final Chimmy response using deterministic facts first, then explain implications and strategy.',
    }
  })

  const finalModel = models.includes('openai')
    ? 'openai'
    : models.includes('deepseek')
      ? 'deepseek'
      : models[0]

  return {
    models,
    tasks,
    finalModel,
  }
}
