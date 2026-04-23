'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SignInButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <Button
      size="lg"
      className="w-full gap-3"
      onClick={() => signIn('google', { callbackUrl: callbackUrl ?? '/dashboard' })}
    >
      <GoogleIcon className="h-5 w-5" />
      Continue with Google
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.8v3.6h5.1c-.21 1.32-1.5 3.87-5.1 3.87-3.06 0-5.58-2.55-5.58-5.7s2.52-5.7 5.58-5.7c1.77 0 2.94.75 3.6 1.38l2.49-2.4C16.53 4.38 14.49 3.5 12 3.5 6.75 3.5 2.5 7.75 2.5 13s4.25 9.5 9.5 9.5c5.49 0 9.12-3.87 9.12-9.3 0-.63-.06-1.11-.15-1.59H12z"
      />
      <path fill="#4285F4" d="M12 10.8v3.6h5.1c-.21 1.32-1.5 3.87-5.1 3.87v-7.47z" />
    </svg>
  );
}
