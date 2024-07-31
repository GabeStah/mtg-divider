const fs = require("fs-extra");
const xml2js = require("xml2js");
const yargs = require("yargs");
const path = require("path");

// Parse command line arguments
const argv = yargs
  .option("target", {
    describe: "Target XML file path",
    type: "string",
    demandOption: true,
  })
  .option("source", {
    describe: "Source directory path",
    type: "string",
    demandOption: true,
  })
  .option("output", {
    describe: "Output XML file path",
    type: "string",
    default: "updated.xml", // Default output file if not specified
  })
  .help().argv;

// Function to read and parse an XML file
async function readXmlFile(filePath) {
  const fileData = await fs.readFile(filePath, "utf-8");
  return xml2js.parseStringPromise(fileData);
}

// Function to write XML object back to file
async function writeXmlFile(filePath, xmlObj) {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(xmlObj);
  await fs.writeFile(filePath, xml);
}

// Function to update the target XML file based on source files
async function updateTargetXML(targetPath, sourcePath, outputPath) {
  const targetXML = await readXmlFile(targetPath);
  const sourceFiles = await fs.readdir(sourcePath);

  // Sort source files by modification time, newest first
  const sortedSourceFiles = await Promise.all(
    sourceFiles.map(async (file) => {
      const fullPath = path.join(sourcePath, file);
      return {
        path: fullPath,
        mtime: (await fs.stat(fullPath)).mtime.getTime(),
      };
    }),
  );
  sortedSourceFiles.sort((a, b) => b.mtime - a.mtime);

  // General function to update cards
  async function updateCards(targetCardsSection, sourceCardSection) {
    const section = targetXML.order[targetCardsSection];
    if (section && section.length > 0 && section[0].card) {
      let targetCards = [].concat(section[0].card);
      for (let card of targetCards) {
        let found = false;
        for (let file of sortedSourceFiles) {
          if (found) break;
          const sourceXML = await readXmlFile(file.path);
          if (
            sourceXML.order &&
            sourceXML.order[sourceCardSection] &&
            sourceXML.order[sourceCardSection][0].card
          ) {
            let sourceCards = [].concat(
              sourceXML.order[sourceCardSection][0].card,
            );
            for (let sourceCard of sourceCards) {
              if (sourceCard.query[0] === card.query[0]) {
                console.log(`Updating card: ${card.query[0]}`);
                // console.log(
                //   `Original ID: ${card.id[0]}, New ID: ${sourceCard.id[0]}`,
                // );
                // console.log(
                //   `Original Name: ${card.name[0]}, New Name: ${sourceCard.name[0]}`,
                // );
                card.id[0] = sourceCard.id[0];
                card.name[0] = sourceCard.name[0];
                found = true;
                break;
              }
            }
          }
        }
        // if (!found) {
        //   console.log(`No update found for card: ${card.query[0]}`);
        // }
      }
    } else {
      console.log(`No cards to update in section: ${targetCardsSection}`);
    }
  }

  // Update fronts and backs
  await updateCards("fronts", "fronts");
  await updateCards("backs", "backs");

  // Write updated XML back to a new file
  await writeXmlFile(outputPath, targetXML);
}

// Execute the update process
updateTargetXML(argv.target, argv.source, argv.output)
  .then(() => console.log(`Update complete. Output saved to ${argv.output}`))
  .catch((err) => console.error("Error updating XML:", err));
