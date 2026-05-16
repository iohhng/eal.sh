import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slips = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/slips" }),
  schema: z.object({
    title: z.string().min(1),
    aliases: z.array(z.string()).default([]),
    generalizes: z.array(z.string()).default([]),
    example_of: z.array(z.string()).default([]),
  }),
});

export const collections = { slips };
