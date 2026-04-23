import { loadModules, loadQuizzes, loadArchetypes } from '../lib/content';

async function main() {
  const [modules, quizzes, archetypes] = await Promise.all([
    loadModules(),
    loadQuizzes(),
    loadArchetypes(),
  ]);
  console.log(`OK ${modules.length} modules`);
  console.log(
    `OK ${quizzes.length} quiz files, ${quizzes.reduce((s, q) => s + q.questions.length, 0)} total questions`,
  );
  console.log(`OK ${archetypes.length} archetypes`);

  const moduleSlugs = new Set(modules.map((m) => m.slug));
  for (const q of quizzes) {
    if (!moduleSlugs.has(q.moduleSlug)) {
      throw new Error(`Quiz references unknown module: ${q.moduleSlug}`);
    }
  }

  const quizModuleSlugs = new Set(quizzes.map((q) => q.moduleSlug));
  for (const m of modules) {
    if (!quizModuleSlugs.has(m.slug)) {
      throw new Error(`Module missing a quiz: ${m.slug}`);
    }
  }

  console.log('OK cross-references valid.');
}

main().catch((err) => {
  console.error('Validation failed:', (err as Error).message);
  process.exit(1);
});
