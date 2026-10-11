const SIDEBAR_KEY = 'smartapp-sidebar';

/** The desktop sidebar's remembered state on this device: open unless the person collapsed it. */
export function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'collapsed';
  } catch {
    return true;
  }
}

export function writeSidebarOpen(open: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, open ? 'expanded' : 'collapsed');
  } catch {
    // Blocked storage: not remembered.
  }
}
