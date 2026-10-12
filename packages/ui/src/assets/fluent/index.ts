// Category icons (decision UI-3): Microsoft Fluent Emoji 3D (MIT, see LICENSE.md), 128 px WebP, about 4 kB each.
// Literal `new URL(…, import.meta.url)` calls so Vite and Next.js bundle each file; a file loads only when shown.
// A category stores the key. `words` are extra search words (English and Filipino) beyond the name.

export interface FluentIcon {
  url: string;
  name: string;
  words: readonly string[];
}

export const FLUENT_ICONS = {
  'rice': { url: new URL('./rice.webp', import.meta.url).href, name: 'Rice', words: ['kanin', 'meal', 'silog', 'rice meal'] },
  'rice-ball': { url: new URL('./rice-ball.webp', import.meta.url).href, name: 'Rice ball', words: ['onigiri'] },
  'curry': { url: new URL('./curry.webp', import.meta.url).href, name: 'Curry', words: ['ulam', 'viand'] },
  'noodles': { url: new URL('./noodles.webp', import.meta.url).href, name: 'Noodles', words: ['pancit', 'ramen', 'mami'] },
  'spaghetti': { url: new URL('./spaghetti.webp', import.meta.url).href, name: 'Spaghetti', words: ['pasta'] },
  'bento': { url: new URL('./bento.webp', import.meta.url).href, name: 'Bento', words: ['meal', 'combo', 'lunch'] },
  'dumpling': { url: new URL('./dumpling.webp', import.meta.url).href, name: 'Dumpling', words: ['siomai', 'siopao', 'dimsum'] },
  'chicken': { url: new URL('./chicken.webp', import.meta.url).href, name: 'Chicken', words: ['manok', 'fried chicken', 'inasal'] },
  'meat': { url: new URL('./meat.webp', import.meta.url).href, name: 'Meat', words: ['karne', 'pork', 'beef', 'liempo'] },
  'bacon': { url: new URL('./bacon.webp', import.meta.url).href, name: 'Bacon', words: ['breakfast', 'tocino'] },
  'egg': { url: new URL('./egg.webp', import.meta.url).href, name: 'Egg', words: ['itlog', 'breakfast'] },
  'fish': { url: new URL('./fish.webp', import.meta.url).href, name: 'Fish', words: ['isda', 'seafood', 'bangus'] },
  'shrimp': { url: new URL('./shrimp.webp', import.meta.url).href, name: 'Shrimp', words: ['hipon', 'seafood'] },
  'burger': { url: new URL('./burger.webp', import.meta.url).href, name: 'Burger', words: ['sandwich'] },
  'fries': { url: new URL('./fries.webp', import.meta.url).href, name: 'Fries', words: ['snacks'] },
  'hotdog': { url: new URL('./hotdog.webp', import.meta.url).href, name: 'Hot dog', words: ['snacks'] },
  'pizza': { url: new URL('./pizza.webp', import.meta.url).href, name: 'Pizza', words: [] },
  'sandwich': { url: new URL('./sandwich.webp', import.meta.url).href, name: 'Sandwich', words: ['bread'] },
  'taco': { url: new URL('./taco.webp', import.meta.url).href, name: 'Taco', words: [] },
  'salad': { url: new URL('./salad.webp', import.meta.url).href, name: 'Salad', words: ['gulay', 'healthy'] },
  'soup': { url: new URL('./soup.webp', import.meta.url).href, name: 'Soup', words: ['sabaw', 'sinigang', 'bulalo'] },
  'bread': { url: new URL('./bread.webp', import.meta.url).href, name: 'Bread', words: ['tinapay', 'pandesal', 'bakery'] },
  'croissant': { url: new URL('./croissant.webp', import.meta.url).href, name: 'Croissant', words: ['pastry', 'bakery'] },
  'pancakes': { url: new URL('./pancakes.webp', import.meta.url).href, name: 'Pancakes', words: ['breakfast'] },
  'waffle': { url: new URL('./waffle.webp', import.meta.url).href, name: 'Waffle', words: ['breakfast'] },
  'cake': { url: new URL('./cake.webp', import.meta.url).href, name: 'Cake', words: ['dessert', 'bakery'] },
  'birthday-cake': { url: new URL('./birthday-cake.webp', import.meta.url).href, name: 'Birthday cake', words: ['dessert', 'party'] },
  'cupcake': { url: new URL('./cupcake.webp', import.meta.url).href, name: 'Cupcake', words: ['dessert', 'bakery'] },
  'pie': { url: new URL('./pie.webp', import.meta.url).href, name: 'Pie', words: ['dessert', 'pastry'] },
  'doughnut': { url: new URL('./doughnut.webp', import.meta.url).href, name: 'Doughnut', words: ['donut', 'dessert'] },
  'cookie': { url: new URL('./cookie.webp', import.meta.url).href, name: 'Cookie', words: ['dessert', 'snacks'] },
  'chocolate': { url: new URL('./chocolate.webp', import.meta.url).href, name: 'Chocolate', words: ['sweets'] },
  'candy': { url: new URL('./candy.webp', import.meta.url).href, name: 'Candy', words: ['sweets', 'kendi'] },
  'ice-cream': { url: new URL('./ice-cream.webp', import.meta.url).href, name: 'Ice cream', words: ['sorbetes', 'dessert'] },
  'shaved-ice': { url: new URL('./shaved-ice.webp', import.meta.url).href, name: 'Shaved ice', words: ['halo-halo', 'dessert'] },
  'coffee': { url: new URL('./coffee.webp', import.meta.url).href, name: 'Coffee', words: ['kape', 'latte', 'espresso', 'drinks'] },
  'milk-tea': { url: new URL('./milk-tea.webp', import.meta.url).href, name: 'Milk tea', words: ['boba', 'drinks', 'tea'] },
  'tea': { url: new URL('./tea.webp', import.meta.url).href, name: 'Tea', words: ['tsaa', 'drinks'] },
  'juice': { url: new URL('./juice.webp', import.meta.url).href, name: 'Juice', words: ['drinks', 'shake'] },
  'soda': { url: new URL('./soda.webp', import.meta.url).href, name: 'Soda', words: ['softdrinks', 'drinks'] },
  'milk': { url: new URL('./milk.webp', import.meta.url).href, name: 'Milk', words: ['gatas', 'drinks', 'dairy'] },
  'water': { url: new URL('./water.webp', import.meta.url).href, name: 'Water', words: ['tubig', 'drinks'] },
  'fruit': { url: new URL('./fruit.webp', import.meta.url).href, name: 'Fruit', words: ['prutas'] },
  'banana': { url: new URL('./banana.webp', import.meta.url).href, name: 'Banana', words: ['saging', 'fruit'] },
  'mango': { url: new URL('./mango.webp', import.meta.url).href, name: 'Mango', words: ['mangga', 'fruit'] },
  'pineapple': { url: new URL('./pineapple.webp', import.meta.url).href, name: 'Pineapple', words: ['pinya', 'fruit'] },
  'watermelon': { url: new URL('./watermelon.webp', import.meta.url).href, name: 'Watermelon', words: ['pakwan', 'fruit'] },
  'strawberry': { url: new URL('./strawberry.webp', import.meta.url).href, name: 'Strawberry', words: ['fruit'] },
  'coconut': { url: new URL('./coconut.webp', import.meta.url).href, name: 'Coconut', words: ['buko', 'niyog'] },
  'vegetables': { url: new URL('./vegetables.webp', import.meta.url).href, name: 'Vegetables', words: ['gulay', 'produce'] },
  'tshirt': { url: new URL('./tshirt.webp', import.meta.url).href, name: 'T-shirt', words: ['damit', 'shirt', 'clothing', 'top'] },
  'dress': { url: new URL('./dress.webp', import.meta.url).href, name: 'Dress', words: ['damit', 'clothing'] },
  'jeans': { url: new URL('./jeans.webp', import.meta.url).href, name: 'Jeans', words: ['pantalon', 'pants', 'clothing'] },
  'shoe': { url: new URL('./shoe.webp', import.meta.url).href, name: 'Shoe', words: ['sapatos', 'sneakers', 'footwear'] },
  'heels': { url: new URL('./heels.webp', import.meta.url).href, name: 'Heels', words: ['sapatos', 'footwear'] },
  'cap': { url: new URL('./cap.webp', import.meta.url).href, name: 'Cap', words: ['hat', 'sumbrero'] },
  'socks': { url: new URL('./socks.webp', import.meta.url).href, name: 'Socks', words: ['medyas'] },
  'handbag': { url: new URL('./handbag.webp', import.meta.url).href, name: 'Handbag', words: ['bag', 'purse'] },
  'backpack': { url: new URL('./backpack.webp', import.meta.url).href, name: 'Backpack', words: ['bag', 'school'] },
  'glasses': { url: new URL('./glasses.webp', import.meta.url).href, name: 'Glasses', words: ['eyewear'] },
  'ring': { url: new URL('./ring.webp', import.meta.url).href, name: 'Ring', words: ['jewelry', 'alahas'] },
  'gem': { url: new URL('./gem.webp', import.meta.url).href, name: 'Gem', words: ['jewelry', 'alahas'] },
  'lipstick': { url: new URL('./lipstick.webp', import.meta.url).href, name: 'Lipstick', words: ['beauty', 'makeup'] },
  'lotion': { url: new URL('./lotion.webp', import.meta.url).href, name: 'Lotion', words: ['beauty', 'skincare'] },
  'soap': { url: new URL('./soap.webp', import.meta.url).href, name: 'Soap', words: ['sabon', 'beauty', 'hygiene'] },
  'phone': { url: new URL('./phone.webp', import.meta.url).href, name: 'Phone', words: ['gadgets', 'cellphone', 'load'] },
  'laptop': { url: new URL('./laptop.webp', import.meta.url).href, name: 'Laptop', words: ['gadgets', 'computer'] },
  'headphones': { url: new URL('./headphones.webp', import.meta.url).href, name: 'Headphones', words: ['gadgets', 'audio'] },
  'watch': { url: new URL('./watch.webp', import.meta.url).href, name: 'Watch', words: ['relo', 'accessories'] },
  'toy': { url: new URL('./toy.webp', import.meta.url).href, name: 'Toy', words: ['laruan', 'kids'] },
  'plant': { url: new URL('./plant.webp', import.meta.url).href, name: 'Plant', words: ['halaman', 'garden'] },
  'flowers': { url: new URL('./flowers.webp', import.meta.url).href, name: 'Flowers', words: ['bulaklak'] },
  'gift': { url: new URL('./gift.webp', import.meta.url).href, name: 'Gift', words: ['regalo'] },
  'shopping-bags': { url: new URL('./shopping-bags.webp', import.meta.url).href, name: 'Shopping bags', words: ['shopping'] },
  'cart': { url: new URL('./cart.webp', import.meta.url).href, name: 'Cart', words: ['grocery'] },
  'package': { url: new URL('./package.webp', import.meta.url).href, name: 'Package', words: ['box', 'parcel'] },
  'label': { url: new URL('./label.webp', import.meta.url).href, name: 'Label', words: ['tag', 'sale'] },
  'receipt': { url: new URL('./receipt.webp', import.meta.url).href, name: 'Receipt', words: [] },
  'money': { url: new URL('./money.webp', import.meta.url).href, name: 'Money', words: ['pera', 'cash'] },
  'card': { url: new URL('./card.webp', import.meta.url).href, name: 'Card', words: ['payment'] },
  'identification-card': { url: new URL('./identification-card.webp', import.meta.url).href, name: 'ID card', words: ['id'] },
  'coin': { url: new URL('./coin.webp', import.meta.url).href, name: 'Coin', words: ['pera'] },
  'store': { url: new URL('./store.webp', import.meta.url).href, name: 'Store', words: ['tindahan', 'shop'] },
  'truck': { url: new URL('./truck.webp', import.meta.url).href, name: 'Truck', words: ['delivery'] },
  'scooter': { url: new URL('./scooter.webp', import.meta.url).href, name: 'Scooter', words: ['delivery', 'motor'] },
  'table': { url: new URL('./table.webp', import.meta.url).href, name: 'Table', words: ['dine'] },
  'printer': { url: new URL('./printer.webp', import.meta.url).href, name: 'Printer', words: [] },
  'clipboard': { url: new URL('./clipboard.webp', import.meta.url).href, name: 'Clipboard', words: [] },
  'inbox': { url: new URL('./inbox.webp', import.meta.url).href, name: 'Inbox', words: [] },
  'mailbox': { url: new URL('./mailbox.webp', import.meta.url).href, name: 'Mailbox', words: [] },
  'search': { url: new URL('./search.webp', import.meta.url).href, name: 'Search', words: [] },
  'bell': { url: new URL('./bell.webp', import.meta.url).href, name: 'Bell', words: [] },
  'megaphone': { url: new URL('./megaphone.webp', import.meta.url).href, name: 'Megaphone', words: ['promo'] },
  'ticket': { url: new URL('./ticket.webp', import.meta.url).href, name: 'Ticket', words: [] },
  'calendar': { url: new URL('./calendar.webp', import.meta.url).href, name: 'Calendar', words: [] },
  'clock': { url: new URL('./clock.webp', import.meta.url).href, name: 'Clock', words: [] },
  'hourglass': { url: new URL('./hourglass.webp', import.meta.url).href, name: 'Hourglass', words: [] },
  'chart': { url: new URL('./chart.webp', import.meta.url).href, name: 'Chart', words: [] },
  'trophy': { url: new URL('./trophy.webp', import.meta.url).href, name: 'Trophy', words: ['best seller'] },
  'star': { url: new URL('./star.webp', import.meta.url).href, name: 'Star', words: ['best seller', 'favorite'] },
  'sparkles': { url: new URL('./sparkles.webp', import.meta.url).href, name: 'Sparkles', words: ['new'] },
  'party': { url: new URL('./party.webp', import.meta.url).href, name: 'Party', words: ['celebration'] },
  'rocket': { url: new URL('./rocket.webp', import.meta.url).href, name: 'Rocket', words: ['new'] },
  'lightbulb': { url: new URL('./lightbulb.webp', import.meta.url).href, name: 'Lightbulb', words: [] },
  'key': { url: new URL('./key.webp', import.meta.url).href, name: 'Key', words: [] },
  'lock': { url: new URL('./lock.webp', import.meta.url).href, name: 'Lock', words: [] },
  'gear': { url: new URL('./gear.webp', import.meta.url).href, name: 'Gear', words: ['tools'] },
  'people': { url: new URL('./people.webp', import.meta.url).href, name: 'People', words: ['group'] },
  'handshake': { url: new URL('./handshake.webp', import.meta.url).href, name: 'Handshake', words: ['deal'] },
} as const satisfies Record<string, FluentIcon>;

export type FluentKey = keyof typeof FLUENT_ICONS;

export function isFluentKey(value: string): value is FluentKey {
  return Object.hasOwn(FLUENT_ICONS, value);
}

export const FLUENT_KEYS: readonly FluentKey[] = Object.keys(FLUENT_ICONS).filter(isFluentKey);

/** Icons whose key, name or search words contain the query (case-insensitive); all icons for an empty query. */
export function searchFluentIcons(query: string): FluentKey[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...FLUENT_KEYS];
  return FLUENT_KEYS.filter((key) => {
    const icon: FluentIcon = FLUENT_ICONS[key];
    return key.includes(needle) || icon.name.toLowerCase().includes(needle) || icon.words.some((word) => word.includes(needle));
  });
}
