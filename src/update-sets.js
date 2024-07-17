const fs = require("fs");
const path = require("path");
const axios = require("axios");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

function processArgs() {
  const argv = process.argv.slice(2);
  let args = {
    setCodes: [],
    sortBy: "code",
    sortDir: "asc",
    randomArt: false,
  };

  for (let i = 0; i < argv.length; i++) {
    if (
      argv[i] === "--sort-by" &&
      argv[i + 1] &&
      !argv[i + 1].startsWith("--")
    ) {
      args.sortBy = argv[i + 1];
      i++;
    } else if (
      argv[i] === "--sort-dir" &&
      argv[i + 1] &&
      !argv[i + 1].startsWith("--")
    ) {
      args.sortDir = argv[i + 1];
      i++;
    } else if (argv[i] === "--random-art") {
      args.randomArt = true;
    } else if (!argv[i].startsWith("--")) {
      args.setCodes.push(argv[i]);
    }
  }

  return args;
}

function sortData(data, sortBy, sortOrder) {
  return data.sort((a, b) => {
    let valA = a[sortBy],
      valB = b[sortBy];
    if (sortOrder === "asc") {
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });
}

function readBackgroundsAndAppendData(setData, randomArt) {
  const backgroundsDirectory = path.join(__dirname, "../assets/backgrounds/");
  const files = fs.readdirSync(backgroundsDirectory);

  setData.forEach((set) => {
    let file;
    if (randomArt) {
      const randomIndex = Math.floor(Math.random() * files.length);
      file = files[randomIndex];
    } else {
      const regex = new RegExp(`\\[${set.code.toUpperCase()}\\]`);
      file =
        files.find((f) => regex.test(f)) ||
        files[Math.floor(Math.random() * files.length)];
    }

    const match = file.match(/^(.*?) \((.*?)\) \[(.*?)\] \{(.*?)\}\.jpg$/);
    if (match) {
      set.card_name = match[1];
      set.artist = match[2];
      set.collector_number = match[4];
    }

    set.background = file;
  });
}

function saveDataToCSV(data, filePath) {
  if (data.length === 0) {
    console.log("No data available to save.");
    return;
  }

  const allKeys = new Set();

  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      allKeys.add(key);
    });
  });

  const headers = Array.from(allKeys).map((key) => ({
    id: key,
    title: key,
  }));

  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers,
  });

  csvWriter
    .writeRecords(data)
    .then(() => {
      console.log(`Data has been saved to ${filePath}`);
    })
    .catch((err) => {
      console.error("Failed to save CSV:", err);
    });
}

async function downloadIconIfNeeded(codeToIconMap) {
  const iconDirectory = path.join(__dirname, "../assets/icons/");

  fs.mkdirSync(iconDirectory, { recursive: true });

  let downloadCount = 0;

  for (let [code, iconUri] of codeToIconMap) {
    const iconPath = path.join(iconDirectory, `${code}.svg`);

    try {
      if (!fs.existsSync(iconPath)) {
        const response = await axios({
          method: "get",
          url: iconUri,
          responseType: "stream",
        });

        response.data.pipe(fs.createWriteStream(iconPath));

        await new Promise((resolve, reject) => {
          response.data.on("end", resolve);
          response.data.on("error", reject);
        });

        downloadCount++;
      }
    } catch (error) {
      console.error(`Failed to download icon for ${code}: ${error.message}`);
    }
  }

  if (downloadCount > 0) {
    console.log(`Downloaded ${downloadCount} icons.`);
  }
}

function createCodeToIconMap(setData) {
  const codeToIconMap = new Map(
    setData.map((set) => [set.code, set.icon_svg_uri]),
  );
  return codeToIconMap;
}

class SetFetcher {
  constructor(setCodes = []) {
    this.setCodes = setCodes;
    this.apiEndpoint = "https://api.scryfall.com/sets";
    this.ignoredSets = new Set(["exampleSetCode1", "exampleSetCode2"]); // Update as needed
    this.minimumSetSize = 50; // Update as needed
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
      "from_the_vault", // Make sure to adjust the MINIMUM_SET_SIZE if you want these
      "archenemy",
      "box",
      "funny", // Unglued, Unhinged, Ponies: TG, etc.
    ]);
  }

  async getSetData() {
    try {
      console.log("Getting set data and icons from Scryfall");

      const response = await axios.get(this.apiEndpoint);
      const data = response.data.data || [];

      if (this.setCodes.length > 0) {
        const specifiedSets = new Set(
          this.setCodes.map((code) => code.toLowerCase()),
        );
        const unknownSets = new Set(
          [...specifiedSets].filter(
            (code) => !data.some((set) => set.code.toLowerCase() === code),
          ),
        );

        if (unknownSets.size > 0) {
          console.log(`Unknown sets: ${Array.from(unknownSets).join(", ")}`);
        }

        return data.filter((exp) => specifiedSets.has(exp.code.toLowerCase()));
      } else {
        return data.filter(
          (exp) =>
            !this.ignoredSets.has(exp.code) &&
            exp.card_count >= this.minimumSetSize &&
            (this.setTypes.size === 0 || this.setTypes.has(exp.set_type)) &&
            !exp.digital &&
            (!exp.nonfoil_only || !exp.foil_only),
        );
      }
    } catch (error) {
      console.log(`Error occurred while fetching set data: ${error.message}`);
      return [];
    }
  }
}

const args = processArgs();
const fetcher = new SetFetcher(args.setCodes);
fetcher.getSetData().then((data) => {
  readBackgroundsAndAppendData(data, args.randomArt);
  data = sortData(data, args.sortBy, args.sortDir); // Sort data before saving to CSV

  const csvPath = path.join(__dirname, "../data/sets.csv");
  saveDataToCSV(data, csvPath);

  const codeToIconMap = createCodeToIconMap(data);
  downloadIconIfNeeded(codeToIconMap).then(() => {
    console.log("Update complete");
  });
});
