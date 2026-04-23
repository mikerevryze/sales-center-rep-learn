'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renders trusted markdown (stored in our own content files / DB).
 * We still pass through rehype-sanitize as a defense-in-depth layer —
 * admins may one day edit content via a UI and we want HTML injection
 * to be impossible by construction.
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose-revryze', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
