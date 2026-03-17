/**
 * PROMPT 248 — AI Performance: parallel calls.
 * Run multiple independent AI (or async) calls in parallel with optional timeout.
 */

export interface RunInParallelOptions {
  /** Max time (ms) for the whole batch. No timeout if not set. */
  timeoutMs?: number
  /** If true, use Promise.allSettled so one failure does not reject the batch. */
  settled?: boolean
}

/**
 * Run multiple async tasks in parallel. Uses Promise.all by default for speed.
 * Set settled: true to get all results even when some fail.
 */
export async function runAICallsInParallel<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  options: RunInParallelOptions = {}
): Promise<T[]> {
  const { timeoutMs, settled } = options
  const promises = tasks.map((fn) => fn())

  let result: Promise<T[]>
  if (settled) {
    result = Promise.allSettled(promises).then((outcomes) =>
      outcomes.map((o) => (o.status === 'fulfilled' ? o.value : (null as unknown as T)))
    )
  } else {
    result = Promise.all(promises)
  }

  if (timeoutMs == null || timeoutMs <= 0) return result

  const timeoutPromise = new Promise<T[]>((_, reject) =>
    setTimeout(() => reject(new Error('Parallel AI timeout')), timeoutMs)
  )
  return Promise.race([result, timeoutPromise])
}

/**
 * Run N tasks in parallel and return only successful results (for allSettled use case).
 * Failed tasks are omitted; order is preserved with null for failures when keepOrder is true.
 */
export async function runAICallsInParallelSettled<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  options: RunInParallelOptions & { keepOrder?: boolean } = {}
): Promise<Array<T | null>> {
  const outcomes = await Promise.allSettled(tasks.map((fn) => fn()))
  if (options.keepOrder) {
    return outcomes.map((o) => (o.status === 'fulfilled' ? o.value : null))
  }
  const successful: T[] = []
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') successful.push(outcome.value)
  }
  return successful
}
