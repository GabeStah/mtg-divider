MTG Divider is a tool to help generate collection dividers for Magic: The Gathering cards. The generated dividers are exported at 62mm x 100mm (the standard size of a [Trump game card](https://en.wikipedia.org/wiki/Trump_(card_games))) and are configured to be printed at makeplayingcards.com using their [Trump card template](https://www.makeplayingcards.com/design/custom-trump-cards.html).  These dividers will fit in a vertical [Arkhive Xenoskin by Ultimate Guard](https://ultimateguard.com/en/Boxes/Arkhive-Xenoskin/UGD011256/), [BCW card bins](https://www.bcwsupplies.com/trading-card/trading-card-boxes), or most other larger vertical collection boxes.

This tool was designed to create dividers based on MTG sets, but it could be used to create other types of dividers with some tweaking.  It has two primary components:

- Data collection + CSV generation: A local script collects set data from Scryfall and generates a CSV file with card names and set information.  See the `data/sets.csv` file for the latest data.
- Card art generation: A custom Adobe Illustrator script reads the data in `data/sets.csv` and auto-generates cards with the appropriate set name, set symbol, release date, parent set symbol (if applicable), and associated background art+artist.

## Caveats

- The background arts are vertical to help fill out as much of the vertical space of a 100mm tall card as possible.  However, there's still a significant amount of unused space black space at the bottom of each rendered divider.  However, given that only the top portion of the divider will be visible at most times, this shouldn't be a significant issue.
- You may need to relink some frame files in the Adobe Illustrator template.  If so, you can find them in the `assets/frames` directory.

## Download existing dividers

You can freely download individual dividers from the `output` directory.  Each divider is named with the set code and set name.

Alternatively, you can download the entire set of dividers from the [releases page](https://github.com/GabeStah/mtg-divider/releases/tag/v1.0.0) by unzipping the Source code (zip) file.

## Usage

### Prerequisites

- Adobe Illustrator: To generate cards from the data in `data/sets.csv`. Tested on Illustrator 2024, but should work with older versions.
- Install the Beleren fonts, which are the default fonts used in Magic card titles.  Download both Beleren fonts from here and double-click to install them: https://github.com/Investigamer/Proxyshop/tree/main/fonts
- *(Optional)* [NodeJS](https://nodejs.org/en) installed on your machine.  Only required if you want to automatically update the set data.  You can also manually update the `data/sets.csv` file.

### Image generation

1. Open the `scripted-trump-size-card.ai` file in Adobe Illustrator.
2. In the **Layers** panel, select the *Icon* or *Background* layer.  This helps prevent accidental errors due to layer locks when running the script.
3. Navigate to **File > Scripts > Other Script...** and select the `src/generate-images.jsx` file.

The script will automatically generate a card for each row in the `data/sets.csv` file.  The generated cards will be saved in the `output` directory.

### Set data collection

The `data/sets.csv` file contains the set data used to generate the dividers.

This can be adjusted by modifying the `SetFinder.setTypes` property in the `src/update-sets.js` file.

```javascript
this.setTypes = new Set([
  "core",
  "expansion",
  "starter", // Portal, P3k, welcome decks
  "masters",
  "commander",
  "planechase",
  "draft_innovation", // Battlebond, Conspiracy
  "duel_deck", // Duel Deck Elves,
  "premium_deck", // Premium Deck Series: Slivers, Premium Deck Series: Graveborn
  "from_the_vault",
  "archenemy",
  "box",
  "funny", // Unglued, Unhinged, Ponies: TG, etc.
]);
```

The script also currently ignores digital-only sets and sets with fewer than 5 cards.

You can also add any sets you want to ignore to the `SetFinder.ignoredSets` property in the `src/update-sets.js` file.

```javascript
this.ignoredSets = new Set(["exampleSetCode1", "exampleSetCode2"]);
```

#### Automatically updating set data

To update the set data, install the prerequisite libraries:

```bash
pnpm install
```

Then run the following command from a local terminal:

```bash
node src/update-sets.js
```

This script automatically fetches the latest set data from Scryfall and updates the `data/sets.csv` file.  It will also attempt to automatically assigned appropriate background art to each set based on the set code.  See [Background art](#background-art) for more information.

#### Optional arguments

- `--sort-by`: Sorts the sets by the given property.  Possible values are any property [returned by the Scryfall API](https://scryfall.com/docs/api/sets).  Default is `code`.
- `--sort-dir`: Sorts the sets in ascending or descending order.  Possible values are `asc` or `desc`.  Default is `asc`.

#### Retrieving specific set data

If you want to retrieve data for specific sets you can add the set code(s) as arguments to the script, e.g.:

```bash
node src/update-sets.js exampleSetCode1 exampleSetCode2 exampleSetCode3
```

If you're using with optional arguments, add the additional args after the set codes, e.g.:

```bash
node src/update-sets.js exampleSetCode1 exampleSetCode2 exampleSetCode3 --sort-by released_at --sort-dir desc
```

### Background art

The background art currently found in `assets/backgrounds` is a collection of vertical / full art from various MTG cards.  The `src/update-sets.js` script tries to automatically find an appropriate piece of background art in that directory for a given set based on the set code.  If no matching background is found, a random background is selected.

#### Adding new background art

You may add any new background art you wish to the `assets/backgrounds` directory.  Once a new background is added, update the `data/sets.csv` with the appropriate filename on the row you want to use that piece of background art.