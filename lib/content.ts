import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const CONTENT_ROOT = join(process.cwd(), 'content');

// ============================================
// Modules (markdown with frontmatter)
// ============================================

const moduleFrontmatterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  orderIndex: z.number().int().min(1),
  isFinal: z.boolean().default(false),
});

export type ModuleFile = z.infer<typeof moduleFrontmatterSchema> & {
  contentMarkdown: string;
  filename: string;
};

export async function loadModules(): Promise<ModuleFile[]> {
  const dir = join(CONTENT_ROOT, 'modules');
  const entries = await readdir(dir);
  const mdFiles = entries.filter((f) => f.endsWith('.md')).sort();
  const modules = await Promise.all(
    mdFiles.map(async (filename) => {
      const raw = await readFile(join(dir, filename), 'utf-8');
      const { data, content } = matter(raw);
      const parsed = moduleFrontmatterSchema.parse(data);
      return { ...parsed, contentMarkdown: content.trim(), filename };
    }),
  );
  const sorted = modules.sort((a, b) => a.orderIndex - b.orderIndex);

  // Sanity checks so a malformed edit doesn't silently corrupt the DB on seed.
  const seenOrders = new Set<number>();
  const seenSlugs = new Set<string>();
  for (const m of sorted) {
    if (seenOrders.has(m.orderIndex))
      throw new Error(`Duplicate orderIndex in modules: ${m.orderIndex}`);
    if (seenSlugs.has(m.slug)) throw new Error(`Duplicate slug in modules: ${m.slug}`);
    seenOrders.add(m.orderIndex);
    seenSlugs.add(m.slug);
  }
  return sorted;
}

// ============================================
// Quizzes (one JSON per module slug)
// ============================================

const quizQuestionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

const quizFileSchema = z.object({
  moduleSlug: z.string().regex(/^[a-z0-9-]+$/),
  questions: z.array(quizQuestionSchema).min(8).max(12),
});

export type QuizFile = z.infer<typeof quizFileSchema>;
export type QuizQuestionFile = z.infer<typeof quizQuestionSchema>;

export async function loadQuizzes(): Promise<QuizFile[]> {
  const dir = join(CONTENT_ROOT, 'quizzes');
  const entries = await readdir(dir);
  const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort();
  return Promise.all(
    jsonFiles.map(async (filename) => {
      const raw = await readFile(join(dir, filename), 'utf-8');
      try {
        return quizFileSchema.parse(JSON.parse(raw));
      } catch (err) {
        throw new Error(`Invalid quiz file ${filename}: ${(err as Error).message}`);
      }
    }),
  );
}

// ============================================
// Archetypes (one JSON per archetype)
// ============================================

const archetypeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  persona: z.string().min(1),
  backstory: z.string().min(1),
  emotionalWeight: z.string().min(1),
  likelyObjections: z.array(z.string().min(1)).min(1),
  whatClosesThem: z.string().min(1),
  whatFrustrates: z.string().min(1),
  randomizationHints: z.object({
    ageRange: z.string().min(1),
    citiesHint: z.string().min(1),
    priceConcernRange: z.string().min(1),
    otherVariables: z.string().min(1),
  }),
  openingLine: z.string().min(1),
});

export type Archetype = z.infer<typeof archetypeSchema>;

export async function loadArchetypes(): Promise<Archetype[]> {
  const dir = join(CONTENT_ROOT, 'archetypes');
  const entries = await readdir(dir);
  const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort();
  const archetypes = await Promise.all(
    jsonFiles.map(async (filename) => {
      const raw = await readFile(join(dir, filename), 'utf-8');
      try {
        return archetypeSchema.parse(JSON.parse(raw));
      } catch (err) {
        throw new Error(`Invalid archetype file ${filename}: ${(err as Error).message}`);
      }
    }),
  );

  const slugs = new Set<string>();
  for (const a of archetypes) {
    if (slugs.has(a.slug)) throw new Error(`Duplicate archetype slug: ${a.slug}`);
    slugs.add(a.slug);
  }
  return archetypes;
}

export async function loadArchetypeBySlug(slug: string): Promise<Archetype | null> {
  const all = await loadArchetypes();
  return all.find((a) => a.slug === slug) ?? null;
}
