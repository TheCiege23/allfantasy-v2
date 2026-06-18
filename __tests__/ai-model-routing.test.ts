import { describe, expect, it } from 'vitest'
import {
  classifyRedraftQuestionForModel,
  selectOpenAIModelForIntent,
} from '@/lib/ai/modelRouting'

describe('AI model routing', () => {
  const env = {
    OPENAI_MODEL_CHEAP: 'cheap-model',
    OPENAI_MODEL_STRONG: 'strong-model',
    OPENAI_MODEL: 'default-model',
  }

  it('uses cheap/fast model for normal grounded answers', () => {
    const route = selectOpenAIModelForIntent('grounded_answer', env)
    expect(route.profile).toBe('cheap_fast')
    expect(route.model).toBe('cheap-model')
  })

  it('uses stronger model for complex trades', () => {
    const intent = classifyRedraftQuestionForModel('Analyze this trade package for ROS risk and positional impact')
    const route = selectOpenAIModelForIntent(intent, env)
    expect(intent).toBe('complex_trade')
    expect(route.profile).toBe('strong')
    expect(route.model).toBe('strong-model')
  })

  it('uses stronger model for commissioner reports', () => {
    const intent = classifyRedraftQuestionForModel('Generate weekly recap and power rankings for the commissioner')
    const route = selectOpenAIModelForIntent(intent, env)
    expect(intent).toBe('commissioner_report')
    expect(route.profile).toBe('strong')
    expect(route.model).toBe('strong-model')
  })
})
