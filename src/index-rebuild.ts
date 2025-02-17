import { CURRENT_SCRAPER_VERSION } from './constants.ts';
import { saveScrapingOutput } from './file-management.ts';

console.log(`${CURRENT_SCRAPER_VERSION} - Starting index rebuild`)

saveScrapingOutput([]);

console.log(`${CURRENT_SCRAPER_VERSION} - Finished index rebuild`);
