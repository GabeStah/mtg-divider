const fs = require("fs");
const path = require("path");
const axios = require("axios");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

function readBackgroundsAndAppendData(setData) {
  const backgroundsDirectory = path.join(__dirname, "../assets/backgrounds/");
  const files = fs.readdirSync(backgroundsDirectory);

  setData.forEach((set) => {
    // Attempt to find a background that matches the set code.
    const regex = new RegExp(`\\[${set.code.toUpperCase()}\\]`);
    let file = files.find((f) => regex.test(f));

    // If no matching file is found, pick a random background.
    if (!file) {
      const randomIndex = Math.floor(Math.random() * files.length);
      file = files[randomIndex];
    }

    // Extract details from the chosen background file name.
    const match = file.match(/^(.*?) \((.*?)\) \[(.*?)\] \{(.*?)\}\.jpg$/);
    if (match) {
      set.card_name = match[1];
      set.artist = match[2];
      set.collector_number = match[4];
    }

    // Append the background file name to the set object
    set.background = file;
  });
}

function saveDataToCSV(data, filePath) {
  if (data.length === 0) {
    console.log("No data available to save.");
    return;
  }

  // Create a set to track all unique keys
  const allKeys = new Set();

  // Add every key found in each data object to the set of all keys
  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      allKeys.add(key);
    });
  });

  // Create headers for CSV from all unique keys
  const headers = Array.from(allKeys).map((key) => ({
    id: key,
    title: key,
  }));

  // Initialize the CSV writer with dynamically determined headers
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers,
  });

  // Write the data to the CSV file
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

  // Ensure the directory exists
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

        // Wait for the download to finish
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
    this.minimumSetSize = 5; // Update as needed
    this.setTypes = new Set([
      "core",
      "expansion",
      "commander",
      "draft_innovation",
    ]);
  }

  async getSetData() {
    try {
      console.log("Getting set data and icons from Scryfall");

      const response = await axios.get(this.apiEndpoint);
      const data = response.data.data || [];

      const knownSets = new Set(data.map((set) => set.code));
      const specifiedSets = new Set(
        this.setCodes.map((code) => code.toLowerCase()),
      );
      const unknownSets = new Set(
        [...specifiedSets].filter((x) => !knownSets.has(x)),
      );

      if (unknownSets.size > 0) {
        console.log(`Unknown sets: ${Array.from(unknownSets).join(", ")}`);
      }

      return data.filter(
        (exp) =>
          !this.ignoredSets.has(exp.code) &&
          exp.card_count >= this.minimumSetSize &&
          (this.setTypes.size === 0 || this.setTypes.has(exp.set_type)) &&
          (this.setCodes.length === 0 ||
            specifiedSets.has(exp.code.toLowerCase())) &&
          !exp.digital && // Assuming we want to ignore purely digital sets
          (!exp.nonfoil_only || !exp.foil_only), // Additional conditions based on foil preferences
      );
    } catch (error) {
      console.log(`Error occurred while fetching set data: ${error.message}`);
      return [];
    }
  }
}

// Usage
// Usage
const fetcher = new SetFetcher(); // Specify set codes here
fetcher.getSetData().then((data) => {
  readBackgroundsAndAppendData(data);

  // console.log("Final data before saving to CSV:", data[0]);

  const csvPath = path.join(__dirname, "../data/sets.csv");
  saveDataToCSV(data, csvPath); // Save the data to CSV

  const codeToIconMap = createCodeToIconMap(data);
  downloadIconIfNeeded(codeToIconMap).then(() => {
    console.log("Update complete");
  });
});
