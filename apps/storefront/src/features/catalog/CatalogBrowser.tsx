'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { WORDS } from '@smartapp/core';
import type { StorefrontItem } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { Button } from '@smartapp/ui/components/button';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@smartapp/ui/components/input-group';
import { IconSearch, IconX } from '@smartapp/ui/icons';

import { useShop } from '../shell/ShopProvider';
import { CategoryChips, sectionId } from './CategoryChips';
import { ItemCard } from './ItemCard';

const words = WORDS.storefront.menu;
/** Items with no category, in a last section. */
const OTHER = 'other';

interface Section {
  id: string;
  name: string;
  items: StorefrontItem[];
}

function matches(item: StorefrontItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || item.name.toLowerCase().includes(needle) || (item.description ?? '').toLowerCase().includes(needle);
}

/** The menu page: sticky search and category chips, then a section per category with a grid of cards. */
export function CatalogBrowser() {
  const { storefront, catalogLabel } = useShop();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sections = useMemo<Section[]>(() => {
    const visible = storefront.items.filter((item) => matches(item, query));
    const known = new Set(storefront.categories.map((category) => category.id));
    const byCategory: Section[] = storefront.categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: visible.filter((item) => item.categoryId === category.id),
    }));
    const other = visible.filter((item) => item.categoryId === null || !known.has(item.categoryId));
    return [...byCategory, { id: OTHER, name: words.other, items: other }].filter((section) => section.items.length > 0);
  }, [storefront.items, storefront.categories, query]);

  // Scrolling highlights the chip of the section at the top of the screen.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = top?.target.getAttribute('data-section');
        if (id) setActive(id);
      },
      { rootMargin: '-160px 0px -55% 0px' },
    );
    for (const section of list.querySelectorAll('[data-section]')) observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, [sections]);

  // Keeps the active chip in view inside the chip row.
  useEffect(() => {
    if (active === null) return;
    document.querySelector(`[data-chip="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  const chips = sections.flatMap((section) => storefront.categories.filter((category) => category.id === section.id));

  if (storefront.items.length === 0) {
    return (
      <Empty className="min-h-[50dvh]">
        <EmptyHeader>
          <EmptyMedia>
            <img src={FLUENT_ICONS.store.url} alt="" className="size-16" />
          </EmptyMedia>
          <EmptyTitle>{words.empty(catalogLabel)}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2 bg-shop-60 px-4 pt-2 pb-2 lg:top-16 lg:-mx-8 lg:px-8">
        <h1 className="sr-only">{catalogLabel}</h1>
        <InputGroup className="h-11 bg-background">
          <InputGroupAddon>
            <IconSearch aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            enterKeyHint="search"
            value={query}
            aria-label={words.search(catalogLabel)}
            placeholder={words.search(catalogLabel)}
            className="text-base"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
          {query !== '' && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label={words.clear}
                onClick={() => {
                  setQuery('');
                }}
              >
                <IconX />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        {chips.length > 1 && (
          <CategoryChips
            categories={chips}
            label={WORDS.storefront.home.categories}
            active={active}
            onPick={(id) => {
              setActive(id);
              document.getElementById(sectionId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        )}
      </div>

      {sections.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <img src={FLUENT_ICONS.search.url} alt="" className="size-16" />
            </EmptyMedia>
            <EmptyTitle className="break-words">{words.noMatch(query.trim())}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
              }}
            >
              {words.clear}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div ref={listRef} className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.id} id={sectionId(section.id)} data-section={section.id} aria-labelledby={`${sectionId(section.id)}-title`} className="scroll-mt-36 lg:scroll-mt-52">
              <h2 id={`${sectionId(section.id)}-title`} className="mb-3 text-lg font-semibold">
                {section.name}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <ItemCard item={item} className="h-full" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
