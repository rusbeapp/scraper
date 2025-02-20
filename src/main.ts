import * as cheerio from 'npm:cheerio@1.0.0';
// @deno-types="npm:@types/luxon@3"
import { DateTime } from 'npm:luxon@3.5.0';

import { CURRENT_SCRAPER_VERSION, WEEKDAY_NAMES } from './constants.ts';
import { Meal, MealItem, MealSet, MealType, OperationDay } from './types/v2.ts';
import { capitalizeFirstLetter, getArchiveEntryFilenameDateFormatString, parseMealDateString, parseMealTimeString } from './utils.ts';
import { saveScrapingOutput } from './file-management.ts';

export const PAGE_URL = 'https://www.ufpe.br/restaurante';

console.log(`${CURRENT_SCRAPER_VERSION} - Fetching ${PAGE_URL}`)

const response = await fetch(PAGE_URL); // TODO: retry automatically if failed
const responseText = await response.text();

console.log(`${CURRENT_SCRAPER_VERSION} - Scraping ${PAGE_URL}`)

const page = cheerio.load(responseText);

const operationDaySections = page('section.tabs__content');
const operationDays: OperationDay[] = [];

for (const section of operationDaySections) {
    const sectionId = page(section).attr('id');
    const sectionTitle = page(`span[role="tab"][aria-controls="${sectionId}"]`).text().trim();
    
    const note = '' // FIXME: temporary disable note parsing

    const sectionDay = sectionTitle.trim();
    const [_weekDay, dateString] = (() => {
        const splittedSectionDay = sectionDay.split('-').map(text => text.trim());
        
        if (splittedSectionDay.length >= 2) {
            return splittedSectionDay
        }
        
        const weekDay = WEEKDAY_NAMES.find(weekDay => sectionDay.includes(weekDay));
        if (weekDay) {
            const date = sectionDay.replace(weekDay, '').trim();
            return [weekDay, date];
        }

        console.log(`${CURRENT_SCRAPER_VERSION} - Could not parse week day from ${sectionTitle}`)
        return ['', sectionDay];
    })()

    let date: DateTime<true>;

    try {
        date = parseMealDateString(dateString)
    } catch (e) {
        console.log(`${CURRENT_SCRAPER_VERSION} - Could not parse date from ${dateString}, ${e}`);
        continue;
    }

    console.log(`${CURRENT_SCRAPER_VERSION} - Scraping ${getArchiveEntryFilenameDateFormatString(date)}`);

    const operationDay: OperationDay = {
        date: date.toJSDate(),
        meals: [],
        note
    }

    const tableRows = page('table tr', section);
    let foundTableHeader = false;
    const indexedMeals: {
        meal: Meal,
        index: number
    }[] = [];

    for (const row of tableRows) {
        if (foundTableHeader) {
            const mealSetCells = page('td', row).toArray();
            const mealSetNameCell = mealSetCells.shift();
            const mealSetName = page(mealSetNameCell)?.text().trim();

            if (mealSetName == null || mealSetName === '' || mealSetCells.length === 0) {
                continue;
            }

            for (const [index, cell] of mealSetCells.entries()) {
                if (page(cell).text().trim() === '') {
                    continue;
                }

                const mealSet: MealSet = {
                    name: mealSetName,
                    items: []
                };
                const mealSetItems = cell.children;
                for (const item of mealSetItems) {
                    const mealString = page(item).text().trim().normalize('NFKD');
                    if (mealString === '') {
                        continue;
                    }
                    const dividedMealStrings = mealString.split(' ou ');

                    const mealItems: MealItem[] = dividedMealStrings.map(mealString => {
                        const notes = mealString.match(/\(([^)]+)\)/g);

                        if (notes != null && notes.length > 0) {
                            let strippedMealString = mealString
                            for (const note of notes) {
                                strippedMealString = strippedMealString.replace(note, '');
                            }
                            return {
                                name: capitalizeFirstLetter(strippedMealString.trim()),
                                notes: notes.map(note =>
                                    note.trim()
                                        .replace('(', '')
                                        .replace(')', ''))
                            };
                        } else {
                            return {
                                name: capitalizeFirstLetter(mealString.trim()),
                                notes: []
                            }
                        }
                    });
                    
                    mealSet.items.push(...mealItems);
                }

                indexedMeals.find(indexedMeal => indexedMeal.index === index)?.meal.sets.push(mealSet);
            } 
        } else {
            const headerCells = page('h4', row);
            if (headerCells.length > 0) {
                foundTableHeader = true;
                for (const [index, cell] of headerCells.toArray().entries()) {
                    const [mealType, mealTime] = page(cell).text().split('-').map(text => text.trim());
                    const [startTime, endTime] = mealTime.split('às').map(text => text.trim());
    
                    let meal: Meal;

                    try {
                        meal = {
                            type: mealType as MealType,
                            startTime: parseMealTimeString(startTime, date).toJSDate(),
                            endTime: parseMealTimeString(endTime, date).toJSDate(),
                            sets: []
                        };

                        indexedMeals.push({ meal, index });
                    } catch (e) {
                        console.log(`${CURRENT_SCRAPER_VERSION} - Cannot scrape meal for ${dateString}, ${e}`);
                    }
                }
            }
        }
    }

    for (const indexedMeal of indexedMeals) {
        if (indexedMeal.meal.sets.length > 0) {
            operationDay.meals.push(indexedMeal.meal);
        }
    }

    operationDays.push(operationDay);
}

console.log(`${CURRENT_SCRAPER_VERSION} - Scraping finished, ${operationDays.length} days found`);

saveScrapingOutput(operationDays);

console.log(`${CURRENT_SCRAPER_VERSION} - Finished`);
