const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { program } = require("commander");

program
  .option("--card-count <number>", "number of cards to produce", "440")
  .option("--step <number>", "size of the step between collector numbers", "50")
  .option("--max-cn <number>", "maximum collector number to process", "450")
  .option(
    "--initial-cn <number>",
    "initial (lowest) collector number to start with",
    "51",
  );

program.parse(process.argv);

const options = program.opts();

const cardCount = parseInt(options["card-count"], 10) || 440;
const step = parseInt(options["step"], 10) || 50;
const maxCn = parseInt(options["max-cn"], 10) || 450;
const initialCn = parseInt(options["initial-cn"], 10) || 51;

function generateCNRanges(step, maxCn, initialCn) {
  let ranges = [];
  for (let i = initialCn; i <= maxCn; i += step) {
    ranges.push({ min: i, max: i + step - 1 });
  }
  return ranges;
}

const cnRanges = generateCNRanges(step, maxCn, initialCn);

function getCNRanges(cardCount, cnRanges) {
  var ranges = [];
  var rangeIndex = 0;

  for (var i = 1; i <= cardCount; i++) {
    ranges.push({ title: getCNRangeFormatted(cnRanges[rangeIndex]) });
    rangeIndex = (rangeIndex + 1) % cnRanges.length; // Reset to 0 when reaching the end
  }

  return ranges;
}

function getCNRangeFormatted(cnRange) {
  return cnRange.min + " - " + cnRange.max;
}

function readBackgroundsAndAppendData(cnRanges) {
  const backgroundsDirectory = path.join(__dirname, "../assets/backgrounds/");
  const files = fs.readdirSync(backgroundsDirectory);

  cnRanges.forEach((range) => {
    const randomIndex = Math.floor(Math.random() * files.length);
    let file = files[randomIndex];

    const match = file.match(/^(.*?) \((.*?)\) \[(.*?)\] \{(.*?)\}\.jpg$/);
    if (match) {
      range.card_name = match[1];
      range.artist = match[2];
      range.collector_number = match[4];
    }

    range.background = file;
  });

  return cnRanges;
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

let data = getCNRanges(cardCount, cnRanges);

readBackgroundsAndAppendData(data);

const csvPath = path.join(__dirname, "../data/cn-ranges.csv");
saveDataToCSV(data, csvPath);
