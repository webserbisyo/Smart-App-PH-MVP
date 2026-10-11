import { WORDS } from '@smartapp/core';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@smartapp/ui/components/sidebar';
import { IconBuildingStore } from '@smartapp/ui/icons';
import type { ShellNavItem } from '@smartapp/ui/lib/nav';

import { AccountMenu } from './AccountMenu';

const words = WORDS.dashboard;

/** Started from shadcn block sidebar-07: navy sidebar that collapses to the 72 px icon rail. */
export function AppSidebar({ items }: { items: readonly ShellNavItem[] }) {
  return (
    <Sidebar collapsible="icon" aria-label={words.nav.label}>
      <SidebarHeader className="h-(--topbar-height-desktop) justify-center">
        <div className="flex items-center gap-3 overflow-hidden px-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground">
            <IconBuildingStore aria-hidden="true" className="size-5" />
          </span>
          <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">{words.shell.shopPlaceholder}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    render={item.link}
                    isActive={item.active}
                    tooltip={item.label}
                    aria-current={item.active ? 'page' : undefined}
                    className="h-11 gap-3 text-sm font-medium group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-3! [&>svg]:size-5"
                  >
                    {item.active && item.activeIcon !== undefined ? item.activeIcon : item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AccountMenu showName />
      </SidebarFooter>
    </Sidebar>
  );
}
