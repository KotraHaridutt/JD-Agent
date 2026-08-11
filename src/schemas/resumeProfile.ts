import { z } from 'zod';

export const ProjectSchema = z.object({
  name: z.string().catch('').default(''),
  stack: z.array(z.string()).catch([]).default([]),
  signals: z.array(z.string()).catch([]).default([])
});

export type Project = z.infer<typeof ProjectSchema>;

export const ResumeProfileSchema = z.object({
  languages: z.array(z.string()).catch([]).default([]),
  frameworks: z.array(z.string()).catch([]).default([]),
  databases: z.array(z.string()).catch([]).default([]),
  infra: z.array(z.string()).catch([]).default([]),
  domains: z.array(z.string()).catch([]).default([]),
  projects: z.array(ProjectSchema).catch([]).default([]),
  depth_signals: z.record(z.string()).catch({}).default({})
});

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
