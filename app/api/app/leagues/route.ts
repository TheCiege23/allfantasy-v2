import { NextRequest } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'

export async function GET(req: NextRequest) {
  return proxyToExisting(req, { targetPath: '/api/league/list' })
}

export async function POST(req: NextRequest) {
  return proxyToExisting(req, { targetPath: '/api/league/create' })
}
