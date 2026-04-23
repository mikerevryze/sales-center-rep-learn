import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignInButton } from '@/components/auth/sign-in-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllowedEmailDomain } from '@/lib/env';

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(callbackUrl ?? '/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-xl font-bold">R</span>
          </div>
          <CardTitle className="text-2xl">Revryze Sales Training</CardTitle>
          <CardDescription>
            Sign in with your <span className="font-semibold">@{getAllowedEmailDomain()}</span>{' '}
            Google account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInButton callbackUrl={callbackUrl} />
          <p className="text-center text-xs text-muted-foreground">
            Only Revryze employees can access this platform.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Trouble signing in?{' '}
            <Link href="/signin/error" className="text-primary underline-offset-4 hover:underline">
              Troubleshooting
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
