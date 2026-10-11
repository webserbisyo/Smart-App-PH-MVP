import { WORDS } from '@smartapp/core';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { IconMoon, IconSun } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

import { setTheme, useTheme } from './theme';

const words = WORDS.dashboard.shell;

/** The account button and menu: who is signed in (P3b) and the light/dark switch, remembered on this device. */
export function AccountMenu({ showName = false }: { showName?: boolean }) {
  const theme = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={words.accountMenu}
        className={cn(
          'pressable flex min-h-11 min-w-11 items-center gap-3 rounded-lg p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
          showName && 'w-full hover:bg-sidebar-accent',
        )}
      >
        <Avatar className="size-8">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        {showName ? <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">{words.account}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={showName ? 'top' : 'bottom'} className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{words.signedOut}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{words.theme}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              setTheme(value === 'dark' ? 'dark' : 'light');
            }}
          >
            <DropdownMenuRadioItem value="light" className="min-h-11">
              <IconSun aria-hidden="true" />
              {words.light}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" className="min-h-11">
              <IconMoon aria-hidden="true" />
              {words.dark}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
