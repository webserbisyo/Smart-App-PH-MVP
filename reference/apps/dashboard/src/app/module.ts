import type { ComponentType, ReactNode } from 'react';

import { defineModule } from '@smartapp/core';
import type { ModuleDefinition, ModuleRoute, Permission } from '@smartapp/core';
import type { MenuAction } from '@smartapp/ui/lib/nav';

/** A screen file default-exports its component. */
export interface ScreenFile {
  default: ComponentType;
}

/** A module's rows in the phone dock's More sheet: it renders its own dialogs and hands the rows to `children`. */
export interface SheetActionsProps {
  /** Off (not a phone, or the role's dock has no sheet): no queries, no rows. */
  enabled: boolean;
  children: (actions: readonly MenuAction[]) => ReactNode;
}

export interface AppModule extends ModuleDefinition<ScreenFile> {
  /** Rows for the More sheet of roles whose dock plan has one (`ROLE_DOCK[role].sheet`): the cashier's shift actions. */
  sheetActions?: { permission: Permission; component: ComponentType<SheetActionsProps> };
}

export type AppModuleRoute = ModuleRoute<ScreenFile>;

/** `defineModule` from core, with this app's screen type and sheet actions. */
export function defineAppModule(module: AppModule): AppModule {
  defineModule(module);
  return module;
}
