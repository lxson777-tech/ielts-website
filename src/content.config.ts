import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Marketing-agent drafts default to true; a human flips this to publish.
    draft: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
  }),
});

export const collections = { blog };
