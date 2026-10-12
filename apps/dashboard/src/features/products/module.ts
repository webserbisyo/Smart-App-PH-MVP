import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

const words = WORDS.dashboard.products;
const editor = () => import('./screens/ProductEditorScreen');

export const productsModule = defineAppModule({
  id: 'products',
  nav: { label: (vocab) => vocab.catalog, icon: 'products', order: 30, placement: 'dock' },
  routes: [
    { path: 'products', screen: () => import('./screens/ProductsScreen') },
    { path: 'products/categories', crumb: words.categories, screen: () => import('./screens/CategoriesScreen') },
    { path: 'products/new', crumb: (vocab) => words.editor.newTitle(vocab.item), screen: editor },
    { path: 'products/$itemId', crumb: (vocab) => vocab.item, screen: editor },
  ],
});
