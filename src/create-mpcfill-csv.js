const csv = require("csv-parser");
const fs = require("fs-extra");
const xml2js = require("xml2js");
const { stringify } = require("csv-stringify");
const yargs = require("yargs");
const { archidektCSVColumns } = require("./archidekt");

const argv = yargs
  .option("inputCSV", {
    alias: "i",
    describe: "Path to the input Archidekt CSV file",
    type: "string",
    demandOption: true,
  })
  .option("xmlDirectory", {
    alias: "x",
    describe: "Path to the directory containing XML files",
    type: "string",
    demandOption: true,
  })
  .option("outputCSV", {
    alias: "o",
    describe: "Path to save the output CSV file",
    type: "string",
    demandOption: true,
  })
  .help()
  .alias("help", "h").argv;

function normalizeName(name) {
  return name.split(" // ")[0].replace(/[’'`]/g, "_").toLowerCase();
}

async function parseXML(filePath) {
  const parser = new xml2js.Parser();
  const data = await fs.readFile(filePath, "utf-8");
  return parser.parseStringPromise(data);
}

async function writeBatchToFile(batch, batchNumber, baseFilePath) {
  const filePath = `${baseFilePath.replace(/\.csv$/, "")}_${batchNumber}.csv`;
  const columns = {
    Quantity: "Quantity",
    Front: "Front",
    FrontID: "Front ID",
    Back: "Back",
    BackID: "Back ID",
  };
  stringify(batch, { header: true, columns: columns }, (err, output) => {
    if (err) throw err;
    fs.writeFile(filePath, output, (err) => {
      if (err) throw err;
      console.log(
        `Batch ${batchNumber} CSV file has been saved as ${filePath}.`,
      );
    });
  });
}

async function processFiles(csvFilePath, xmlDirectory, outputFilePath) {
  let results = []; // Store rows here temporarily
  const xmlFiles = await fs.readdir(xmlDirectory);
  const promises = [];

  xmlFiles.sort(
    (a, b) =>
      fs.statSync(`${xmlDirectory}/${b}`).mtime.getTime() -
      fs.statSync(`${xmlDirectory}/${a}`).mtime.getTime(),
  );

  fs.createReadStream(csvFilePath)
    .pipe(
      csv({
        mapValues: ({ header, index, value }) =>
          archidektCSVColumns.find((col) => col.index === index)?.name
            ? value
            : null,
        headers: archidektCSVColumns.map((col) => col.name), // Dynamically set headers based on predefined column indices
      }),
    )
    .on("data", (row) => {
      results.push(row); // Collect all rows from the stream
    })
    .on("end", async () => {
      // Sort the collected results before processing
      results.sort((a, b) => {
        const setCodeA = a["Set Code"] || "";
        const setCodeB = b["Set Code"] || "";
        // Convert 'Collector Number' to integers. Use a high default value for missing or non-numeric entries to sort them last.
        const collectorNumberA =
          parseInt(a["Collector Number"]) || Number.MAX_SAFE_INTEGER;
        const collectorNumberB =
          parseInt(b["Collector Number"]) || Number.MAX_SAFE_INTEGER;

        if (setCodeA !== setCodeB) {
          return setCodeA.localeCompare(setCodeB);
        } else {
          return collectorNumberA - collectorNumberB; // Correct integer comparison
        }
      });

      for (const row of results) {
        const promise = processRow(row, xmlFiles, xmlDirectory);
        promises.push(promise);
      }

      await Promise.all(promises);

      const maxPerFile = 612;
      let batchNumber = 0;
      let currentBatchTotal = 0;
      let currentBatch = [];

      for (const row of results) {
        let quantity = parseInt(row.Quantity || 0, 10);
        while (quantity > 0) {
          // Keep processing the row until its quantity is fully allocated
          if (currentBatchTotal + quantity > maxPerFile) {
            // Calculate how much of the current row can fit in this batch
            const fittingQuantity = maxPerFile - currentBatchTotal;

            // Add only the fitting portion to the current batch
            currentBatch.push({ ...row, Quantity: fittingQuantity });
            currentBatchTotal += fittingQuantity;

            // Write current batch to file
            await writeBatchToFile(currentBatch, batchNumber, outputFilePath);
            batchNumber++;

            // Reduce the quantity of the row by the amount just used
            quantity -= fittingQuantity;

            // Reset for next batch
            currentBatch = [];
            currentBatchTotal = 0;
          } else {
            // If the entire remaining quantity can fit, add it all
            currentBatch.push({ ...row, Quantity: quantity });
            currentBatchTotal += quantity;
            quantity = 0; // All of row's quantity has been added to a batch
          }
        }
      }

      // Write the last batch if there's anything left
      if (currentBatch.length > 0) {
        await writeBatchToFile(currentBatch, batchNumber, outputFilePath);
      }
    });
}

function processRow(row, xmlFiles, xmlDirectory) {
  return new Promise(async (resolve) => {
    let frontFound = false;
    for (let file of xmlFiles) {
      const xmlData = await parseXML(`${xmlDirectory}/${file}`);
      if (
        xmlData.order.fronts &&
        Array.isArray(xmlData.order.fronts) &&
        xmlData.order.fronts[0].card
      ) {
        const normalizedRowName = normalizeName(row.Name);
        for (const card of xmlData.order.fronts[0].card) {
          const normalizedQuery = card.query[0]
            .toLowerCase()
            .replace(/[’'`]/g, "_");
          const normalizedCardName = card.name[0]
            .toLowerCase()
            .replace(/[’'`]/g, "_");
          if (
            normalizedQuery === normalizedRowName ||
            normalizedCardName.includes(normalizedRowName)
          ) {
            row.Front = card.query[0];
            row.FrontID = card.id[0];
            frontFound = true;

            // Look for the corresponding back card
            if (
              xmlData.order.backs &&
              Array.isArray(xmlData.order.backs) &&
              xmlData.order.backs[0].card
            ) {
              const backCard = xmlData.order.backs[0].card.find(
                (back) => back.slots[0] === card.slots[0],
              );
              if (backCard) {
                row.Back = backCard.query[0];
                row.BackID = backCard.id[0];
                break; // Correct card found, exit the loop
              }
            }
          }
        }
      }

      if (frontFound) {
        break;
      }
    }

    resolve();
  });
}

processFiles(argv.inputCSV, argv.xmlDirectory, argv.outputCSV);
