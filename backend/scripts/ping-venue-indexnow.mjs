#!/usr/bin/env node
/**
 * IndexNow ping для топ посадочных площадок после деплоя SEO.
 */
import { notifySearchIndexing, publicUrl } from '../lib/search-indexing.js';

const SLUGS = [
  'mht-im-chehova',
  'bolshoy-teatr',
  'teatr-im-vahtangova',
  'tsirk-nikulina-na-tsvetnom-bulvare',
  'kremlevskiy-dvorets',
  'ramt',
  'teatr-natsiy',
  'malyy-teatr',
  'lenkom',
  'sovremennik',
  'teatr-na-taganke',
  'vtb-arena',
  'teatr-im-pushkina',
  'masterskaya-petra-fomenko',
  'bolshoy-moskovskiy-gosudarstvennyy-tsirk',
  'events/venues',
];

const urls = SLUGS.map((s) =>
  s.startsWith('events/') ? publicUrl(`/${s}`) : publicUrl(`/events/venue/${s}`),
);

await notifySearchIndexing(urls);
console.log('IndexNow/sitemap pinged', urls.length, 'urls');
