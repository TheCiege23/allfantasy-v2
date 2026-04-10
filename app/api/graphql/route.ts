import { createYoga } from 'graphql-yoga'
import { schema } from '@/graphql/schema'
import { createSportsGraphQLContext } from '@/graphql/context'

export const dynamic = 'force-dynamic'

const INTERNAL_HEADER = 'x-af-internal-key'

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Internal-only gateway: in production, set INTERNAL_GRAPHQL_SECRET and send
 * it as header x-af-internal-key. In development, requests are allowed when the secret is unset.
 */
function assertInternalGraphql(request: Request): Response | null {
  const secret = process.env.INTERNAL_GRAPHQL_SECRET?.trim()
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      return jsonResponse(
        { errors: [{ message: 'Internal GraphQL is not configured' }] },
        503
      )
    }
    if (request.headers.get(INTERNAL_HEADER) !== secret) {
      return jsonResponse({ errors: [{ message: 'Unauthorized' }] }, 401)
    }
    return null
  }
  if (secret && request.headers.get(INTERNAL_HEADER) !== secret) {
    return jsonResponse({ errors: [{ message: 'Unauthorized' }] }, 401)
  }
  return null
}

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  graphiql: process.env.NODE_ENV !== 'production',
  landingPage: false,
  context: () => createSportsGraphQLContext(),
})

function guard(request: Request) {
  return assertInternalGraphql(request)
}

export async function GET(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  return yoga(request, {})
}

export async function POST(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  return yoga(request, {})
}

export async function OPTIONS(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  return yoga(request, {})
}
