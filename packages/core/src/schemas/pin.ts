import { z } from 'zod';

/** A geographic coordinate (latitude and longitude). */
export const Pin = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Pin = z.infer<typeof Pin>;
