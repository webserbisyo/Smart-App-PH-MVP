import type { ComponentType } from 'react';

import { defineModule } from '@smartapp/core';
import type { ModuleDefinition, ModuleRoute } from '@smartapp/core';

// Copied and trimmed from the first build's module.ts (reference/apps/dashboard/src/app/module.ts):
// no permissions, feature switches or sheet actions in the MVP.

/** A screen file default-exports its component. */
export interface ScreenFile {
  default: ComponentType;
}

export type AppModule = ModuleDefinition<ScreenFile>;
export type AppModuleRoute = ModuleRoute<ScreenFile>;

/** `defineModule` from core, with this app's screen type. */
export function defineAppModule(module: AppModule): AppModule {
  return defineModule(module);
}
