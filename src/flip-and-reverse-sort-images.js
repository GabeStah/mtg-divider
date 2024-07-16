const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const inputDir = path.join(__dirname, "../output");
const outputDir = path.join(__dirname, "../output-reversed");

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read files from the input directory
fs.readdir(inputDir, (err, files) => {
  if (err) {
    console.error("Error reading the directory:", err);
    return;
  }

  // Filter to include only images if necessary, here assuming JPEG and PNG files
  let imageFiles = files.filter(
    (file) => file.endsWith(".jpg") || file.endsWith(".png"),
  );

  // Sort files in reverse alphabetical order
  imageFiles.sort().reverse();

  // Process each file
  imageFiles.forEach((file, index) => {
    const inputFilePath = path.join(inputDir, file);
    const outputFilePath = path.join(
      outputDir,
      `${String(index + 1).padStart(4, "0")}-${file}`,
    );

    // Rotate image 180 degrees and save
    sharp(inputFilePath)
      .rotate(180)
      .toFile(outputFilePath)
      .then(() => console.log(`Processed and saved: ${outputFilePath}`))
      .catch((err) => console.error(`Error processing ${file}:`, err));
  });
});
