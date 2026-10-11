// Every query key, in one place. Screens never build keys by hand (docs/api-surface.md).
export const qk = {
  session: ['session'] as const,
  myShop: ['my-shop'] as const,
  slugAvailable: (slug: string) => ['slug-available', slug] as const,
};
