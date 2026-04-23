// Split from `./auth.ts` so the Route Handler file stays tiny and always
// picks up the latest NextAuth config.
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
