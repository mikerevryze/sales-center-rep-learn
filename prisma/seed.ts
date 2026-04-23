import { PrismaClient } from '@prisma/client';
import { loadModules, loadQuizzes } from '../lib/content';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Revryze training content…');

  // ---------- Modules ----------
  const modules = await loadModules();
  console.log(`Loaded ${modules.length} modules from /content/modules.`);

  for (const m of modules) {
    await prisma.module.upsert({
      where: { slug: m.slug },
      create: {
        slug: m.slug,
        orderIndex: m.orderIndex,
        title: m.title,
        summary: m.summary,
        contentMarkdown: m.contentMarkdown,
        isFinal: m.isFinal,
      },
      update: {
        orderIndex: m.orderIndex,
        title: m.title,
        summary: m.summary,
        contentMarkdown: m.contentMarkdown,
        isFinal: m.isFinal,
      },
    });
    console.log(`  ✔ ${m.orderIndex}. ${m.title}`);
  }

  // ---------- Quizzes ----------
  const quizzes = await loadQuizzes();
  console.log(`\nLoaded ${quizzes.length} quiz files from /content/quizzes.`);

  for (const quiz of quizzes) {
    const mod = await prisma.module.findUnique({ where: { slug: quiz.moduleSlug } });
    if (!mod) {
      console.warn(`  ⚠ Skipping quiz for unknown module slug: ${quiz.moduleSlug}`);
      continue;
    }

    // Replace all existing questions for this module. Content is canonical in the
    // JSON file, so the DB should match byte-for-byte after seeding.
    await prisma.quizQuestion.deleteMany({ where: { moduleId: mod.id } });

    for (let i = 0; i < quiz.questions.length; i += 1) {
      const q = quiz.questions[i]!;
      await prisma.quizQuestion.create({
        data: {
          moduleId: mod.id,
          orderIndex: i,
          prompt: q.prompt,
          choicesJson: q.choices,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        },
      });
    }
    console.log(`  ✔ ${quiz.moduleSlug} — ${quiz.questions.length} questions`);
  }

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
