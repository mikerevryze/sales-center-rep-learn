import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllowedEmailDomain } from '@/lib/env';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

// NextAuth v5 error codes:
// https://authjs.dev/reference/core/errors
const MESSAGES: Record<string, { title: string; body: string }> = {
  AccessDenied: {
    title: 'Access denied',
    body: `Sign-in is restricted to @${''} Google accounts. If you believe this is a mistake, contact your pod leader.`,
  },
  Configuration: {
    title: 'Configuration error',
    body: 'The sign-in provider is misconfigured. Contact an administrator.',
  },
  Verification: {
    title: 'Verification failed',
    body: 'The verification link was invalid or expired.',
  },
  Default: {
    title: 'Sign-in failed',
    body: 'Something went wrong during sign-in. Please try again.',
  },
};

export default async function SignInErrorPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const info = (error && MESSAGES[error]) || MESSAGES.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">{info?.title ?? 'Sign-in failed'}</CardTitle>
          <CardDescription>
            {error === 'AccessDenied'
              ? `Only @${getAllowedEmailDomain()} Google accounts can sign in to this platform. If you believe this is a mistake, contact your pod leader.`
              : (info?.body ?? 'Please try again.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/signin">Try again</Link>
          </Button>
          {error && (
            <p className="text-center text-xs text-muted-foreground">
              Error code: <code className="font-mono">{error}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
