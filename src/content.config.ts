import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Коллекция публикаций (статьи, материалы учителей и учеников).
// Новый пост: создайте .md файл в src/content/publications/
export const publicationsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      lang: z.enum(['ru', 'kk']),
      description: z.string(),
      author: z.string(),
      image: image().optional(),
    }),
});

export const collections = {
  publications: publicationsCollection,
};
