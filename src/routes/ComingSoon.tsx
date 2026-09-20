import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** 404 fallback for any route that doesn't match one of the app's real routes. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <h1 className="sr-only">{title}</h1>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Coming in a later phase.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          See <code>docs/ROADMAP.md</code> for what builds this screen and when.
        </CardContent>
      </Card>
    </main>
  )
}
