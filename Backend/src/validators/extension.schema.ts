import { z } from 'zod';

export const lookupUrlSchema = {
  body: z.object({
    // Capped well below a real URL's practical limit — this only ever needs
    // to hold a job posting address, and a large value is a cheap way to
    // waste server time on regex/URL parsing.
    url: z.string().url('A valid URL is required').max(2048),
  }),
};
