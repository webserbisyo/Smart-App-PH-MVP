// @smartapp/api: the only code that talks to Supabase. Names follow docs/api-surface.md.
export * from './client';
export * from './provider';
export * from './keys';
export * from './errors';
export * from './auth/auth';
export * from './auth/hooks';
export * from './shops/shops';
export * from './shops/hooks';
export { tenantFromRow } from './shops/mappers';
export * from './media';
export * from './settings/settings';
export * from './settings/hooks';
export * from './catalog/catalog';
export * from './catalog/hooks';
export * from './storefront/storefront';
export * from './storefront/hooks';
