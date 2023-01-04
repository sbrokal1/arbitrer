import { z } from "zod";

const envSchema = z.object({
  PORT: z.preprocess((a) => {
    return typeof a == "string" ? parseInt(a) : a;
  }, z.number()),
  DATABASE_URL: z.string(),
});

export const env = envSchema.parse(process.env);
