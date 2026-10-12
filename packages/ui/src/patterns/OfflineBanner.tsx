import { IconWifiOff } from '@tabler/icons-react';

import { Alert, AlertDescription } from '#components/alert';
import { useOnline } from '#hooks/use-online';
import { cn } from '#lib/utils';

/** Shows only while the browser is offline. Both app shells render it once, under the top bar. */
export function OfflineBanner({ text, offline, className }: { text: string; /** Overrides the browser's state (the kit). */ offline?: boolean; className?: string }) {
  const online = useOnline();
  if (!(offline ?? !online)) return null;
  return (
    <Alert role="status" className={cn('rounded-none border-x-0 border-t-0 bg-warning-soft text-warning-soft-foreground', className)}>
      <IconWifiOff aria-hidden="true" />
      <AlertDescription className="text-warning-soft-foreground">{text}</AlertDescription>
    </Alert>
  );
}
