// Every visible text of both apps, in English. Words that depend on the kind of shop
// (Menu or Products, Kitchen or Packing) come from VOCAB in ./vocab, never from here.

export const WORDS = {
  app: {
    name: 'Smart App PH',
    dashboardTitle: 'Smart App PH Dashboard',
  },
  storefront: {
    rootHint: 'Open a shop link, for example /juans-cafe',
    nav: {
      label: 'Shop',
      home: 'Home',
      orders: 'Orders',
      account: 'Account',
    },
    cart: {
      title: 'Cart',
      open: 'Open cart',
      close: 'Close cart',
      empty: 'Your cart is empty.',
      /** "Cart · 0 items ₱0". */
      bar: (items: number, total: string) => `Cart · ${String(items)} ${items === 1 ? 'item' : 'items'} ${total}`,
    },
    empty: {
      home: 'Welcome! This page fills in soon.',
      catalog: (catalog: string) => `The ${catalog.toLowerCase()} will show up here.`,
      orders: 'Your orders will show up here.',
      account: 'Your account and member card will show up here.',
    },
  },
  dashboard: {
    nav: {
      label: 'Main',
      home: 'Home',
      orders: 'Orders',
      products: 'Products',
      customers: 'Customers',
      reports: 'Reports',
      settings: 'Settings',
      more: 'More',
      close: 'Close',
    },
    shell: {
      skip: 'Skip to content',
      breadcrumb: 'Breadcrumb',
      toggleSidebar: 'Toggle sidebar',
      shopPlaceholder: 'Your shop',
      account: 'Account',
      accountMenu: 'Account menu',
      signedOut: 'Not signed in',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
    },
    empty: {
      home: "Today's sales and orders will show up here.",
      orders: 'New orders will show up here.',
      products: 'Your products will show up here.',
      customers: 'Your customers and members will show up here.',
      reports: 'Sales reports will show up here.',
      settings: 'Shop settings will show up here.',
    },
    kit: {
      title: 'UI kit',
      intro: 'Every installed component, in light and dark. Not in the nav.',
    },
    notFound: 'Page not found.',
  },
} as const;
