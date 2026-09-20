import { catalog } from '../data/catalog';

process.stdout.write(
  JSON.stringify(
    catalog.map(({ word, difficulty }) => ({ word, difficulty })),
    null,
    2,
  ),
);
