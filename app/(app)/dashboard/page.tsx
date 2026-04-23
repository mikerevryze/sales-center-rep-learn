import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Revryze Training</h1>
        <p className="text-muted-foreground">
          Your dashboard will come to life after the next deploy. The scaffold is ready.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>9 modules of core curriculum, unlocked in order.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/modules">Continue training</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Roleplay</CardTitle>
            <CardDescription>Practice against 11 realistic lead archetypes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/roleplay">Start a practice call</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>See where you rank among the team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/leaderboard">View leaderboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
