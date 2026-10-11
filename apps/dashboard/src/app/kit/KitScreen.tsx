import { WORDS } from '@smartapp/core';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

import { BasicDemos } from './BasicDemos';
import { RichDemos } from './RichDemos';

/** /kit: every installed component in light and dark, at the width of the device it is opened on. */
export default function KitScreen() {
  return (
    <PageBody size="full" className="gap-8">
      <header>
        <h1 className="text-2xl font-bold">{WORDS.dashboard.kit.title}</h1>
        <p className="text-muted-foreground">{WORDS.dashboard.kit.intro}</p>
      </header>
      <BasicDemos />
      <RichDemos />
    </PageBody>
  );
}
