MTG Divider is a tool to help generate collection dividers for Magic: The Gathering cards. The generated dividers are exported at 62mm x 100mm (the standard size of a [Trump game card](https://en.wikipedia.org/wiki/Trump_(card_games))) and are configured to be printed at makeplayingcards.com using their [Trump card template](https://www.makeplayingcards.com/design/custom-trump-cards.html).  These dividers will fit in a vertical [Arkhive Xenoskin by Ultimate Guard](https://ultimateguard.com/en/Boxes/Arkhive-Xenoskin/UGD011256/), [BCW card bins](https://www.bcwsupplies.com/trading-card/trading-card-boxes), or most other larger vertical collection boxes.

![printed-example.mp4](assets/video/printed-example.mp4)

This tool was designed to create dividers based on MTG sets, but it could be used to create other types of dividers with some tweaking.  It has two primary components:

- Data collection + CSV generation: A local script collects set data from Scryfall and generates a CSV file with card names and set information.  See the `data/sets.csv` file for the latest data.
- Card art generation: A custom Adobe Illustrator script reads the data in `data/sets.csv` and auto-generates cards with the appropriate set name, set symbol, release date, parent set symbol (if applicable), and associated background art+artist.

## Caveats

- The background arts are vertical to help fill out as much of the vertical space of a 100mm tall card as possible.  However, there's still a significant amount of unused space black space at the bottom of each rendered divider.  However, given that only the top portion of the divider will be visible at most times, this shouldn't be a significant issue.
- You may need to relink some frame files in the Adobe Illustrator template.  If so, you can find them in the `assets/frames` directory.

## Creating an mpc.com order

If you just want to get all the existing dividers printed follow these steps:

1. Download the latest release from the [releases page](https://github.com/GabeStah/mtg-divider/releases/latest).  It's about 3.5 gigs.
2. Unzip the release and navigate to the `output` directory.
3. Browse to the [Trump card template](https://www.makeplayingcards.com/design/custom-trump-cards.html) page makeplayingcards.com.
4. Select the **Card stock** you want.  I recommend `(A35) Thick standard` for a more durable divider.
5. Change **Size of deck** to `Up to 352 cards` (or however many dividers you have).
6. Leave everything else the default and click **start your design**.
7. A two-step dialog will appear on the next page.  Under **Image & Text** click the **Different images** button.
   
   You'll now be viewing the **Customize Front** page of your project.

8. Click the **Upload images** button.
9. In the file select dialog, navigate to the `output` directory in the downloaded repository and select the first image in the list (e.g. `2ed_unlimited-edition.png`), then press `Ctrl+A` to select all images and click **Open**.
10. Wait for all the images to be uploaded.
11. Click the `[Help me autofill images!]` button, which will automatically place each image on a card.
12. Once the autofill process is complete, click the **Next Step** button.
13. You will see a warning about some blank images in your design.  This is expected and you can click **OK** to continue.

    Alternatively, you can add extra images to those blanks as you see fit.  

14. You can ignore the next **Add Text To Front** page and just click **Next Step** to continue.
15. On the **Customize Back** page, click the **Different images** button.
16. Click the **Upload images** button.
17. In the file select dialog, navigate to the `output-reversed` directory in the downloaded repository and select the first image in the list (e.g. `0001-znr_zendikar-rising.png`), then press `Ctrl+A` to select all images and click **Open**.

    > Note: This step ensures that the back of each divider has a different ("opposite") image from the front and it's flipped upside down.  For example, the back of the `2ed_unlimited-edition.png` divider will be `0001-znr_zendikar-rising.png`.  This allows you to use some dividers twice for more common sets in your collection and ignore those less common sets you don't use.
    > 
    > Alternatively, if you just want the same image on both sides of each divider, just upload the `output` directory contents again for the back side images.

18. Wait for all the images to be uploaded.
19. Click the `[Help me autofill images!]` button to automatically place card images.
20. Once the autofill process is complete, click the **Next Step** button.
21. Again, you can ignore the warning about blank images and click **OK** to continue.
22. You can ignore the next **Add Text To Back** page and just click **Next Step** to continue.
23. On the **Preview & Add to Cart** page you can review the cards and make sure they look correct.

    Most importantly, ensure that the front and page images are correct and that the number of non-blank cards matches.  At the time of writing there are 323 set dividers, so you should have 29 blanks.

24. At the bottom, tick the `Yes, I confirm that all the images...` checkbox and click the **Add to Saved Projects** button.

    This will save your project to your account if you want to keep it around for current or future orders.

25. When you're ready to order, navigate to the [Saved projects](https://www.makeplayingcards.com/design/dn_temporary_designes.aspx) page.
26. For the project listing, click the **Add to cart** button.

    Again, you'll likely see a warning about blank images.  If this is expected and you can click **OK** to continue.

27. Proceed with checkout as normal and wait ~1 week for your dividers to arrive.

## Download existing dividers

You can freely download individual dividers from the `output` directory.  Each divider is named with the set code and set name.

Alternatively, you can download the entire set of dividers from the [releases page](https://github.com/GabeStah/mtg-divider/releases/latest) by unzipping the Source code (zip) file.

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

- `--random-art`: Randomly assigns background art to each set.  Default is `false`.
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

## MPC.com utilities

### Adjust mpcfill.com images

This script allows you to update the images in a target XML file with images from a source directory.  This is useful for updating the images in a decklist exported from Archidekt/Moxfield to use the MPC.com images.

1. Run the script to update images in the target XML file:

   ```bash
   node src/update-mpc-fill-images.js --target data/mdfc-lands-target.xml --source data/mpc
   ```

### Export Archidekt deck to MPC.com

For those using [Archidekt](https://archidekt.com) to manage their decks, you can export a deck to MPC.com with the following steps.

1. _(Optionally)_ Add any labels you want to retain in the final CSV file to cards in your deck in Archidekt.

   For example, you may want to add a "Proxy" label to cards that are being proxied, to help differentiate them from real cards you own

1. Export the deck in Archidekt as a CSV.

   Enable the following columns: Quantity, Name, Edition name, Edition Code, Collector Number, Category, and Label.

1. Download the generated CSV file.
1. Add the following headers to the CSV file:

   ```csv
   quantity,name,edition_name,edition_code,category,label,collector_number
   ```

