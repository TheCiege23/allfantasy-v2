'use client'

import { SocialContentGenerator } from '@/components/social-content'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SocialContentPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Social media content generator</h1>
        <p className="text-sm text-white/60 mt-1">
          Generate ready-to-post captions and images for draft results, weekly recaps, trade reactions, and power rankings. All posts include required hashtags.
        </p>
      </div>
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Generate post</CardTitle>
        </CardHeader>
        <CardContent>
          <SocialContentGenerator />
        </CardContent>
      </Card>
    </main>
  )
}
