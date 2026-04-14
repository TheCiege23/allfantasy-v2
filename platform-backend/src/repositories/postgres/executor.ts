export interface SqlExecutor {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
}
