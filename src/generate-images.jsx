const scriptFile = new File($.fileName);
const scriptDir = scriptFile.path;
const rootDir = scriptDir + "/../";

// Define relative paths
const importPath = rootDir + "data/sets.csv";
const backgroundDir = rootDir + "assets/backgrounds/";
const iconDir = rootDir + "assets/icons/";
const outputPath = rootDir + "output/";

function readCSVFile() {
  let csvFile = new File(importPath);
  if (csvFile.exists) {
    csvFile.open("r");
    let content = csvFile.read();
    csvFile.close();
    return content;
  } else {
    throw new Error("CSV file not found: " + importPath);
  }
}

function parseCSV(data) {
  let lines = data.split("\n");
  let headers = lines[0].split(",");
  let result = [];
  for (let i = 1; i < lines.length; i++) {
    // Start at 1 to skip the header row
    let cells = lines[i].split(",");
    if (cells.length === headers.length) {
      let obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = cells[j];
      }
      result.push(obj);
    }
  }
  return result;
}

function getFileNameFromURL(url) {
  let parts = url.split("/");
  let fileNameWithParams = parts[parts.length - 1];
  return fileNameWithParams.split("?")[0];
}

function formatDate(dateStr) {
  let dateParts = dateStr.split("-");
  let year = dateParts[0];
  let month = dateParts[1];
  let monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  let monthName = monthNames[parseInt(month, 10) - 1];
  return monthName + " " + year;
}

function setArtist(data) {
  let layer = app.activeDocument.layers.getByName("Artist");
  if (layer) {
    let textFrames = layer.textFrames;
    for (let j = 0; j < textFrames.length; j++) {
      if (data.artist) {
        textFrames[j].contents = data.artist;
        if (data.collector_number) {
          textFrames[j].contents += " | " + data.collector_number;
        }
      } else {
        textFrames[j].contents = ""; // Clear if artist is not defined
      }
    }
  } else {
    throw new Error("Artist layer not found");
  }
}

function setIcon(imagePath) {
  let layer = app.activeDocument.layers.getByName("Icon");
  if (layer) {
    // Remove existing content
    while (layer.pageItems.length > 0) {
      layer.pageItems[0].remove();
    }
    // Place new SVG using createFromFile
    let placedItem = placeImage(layer, imagePath);
    if (placedItem) {
      // Match the position and dimensions of the rectangle in the Icon Wrapper layer
      matchRectangle(placedItem);
    }
  } else {
    throw new Error("Icon layer not found");
  }
}

function setSubtitle(text) {
  const layer = app.activeDocument.layers.getByName("Subtitle");
  if (layer) {
    let textFrames = layer.textFrames;
    for (let i = 0; i < textFrames.length; i++) {
      textFrames[i].contents = text;
    }
  } else {
    throw new Error("Subtitle layer not found");
  }
}

function setTitle(text) {
  const layer = app.activeDocument.layers.getByName("Title");
  if (layer) {
    let textFrames = layer.textFrames;
    for (let i = 0; i < textFrames.length; i++) {
      textFrames[i].contents = text;
    }
  } else {
    throw new Error("Title layer not found");
  }
}

function updateContent(data) {
  for (let i = 0; i < data.length; i++) {
    if (i >= 5) break; // Process only the first 5 rows

    let set = data[i];
    let textContent = set.name;

    setTitle(textContent);
    setSubtitle(set.code.toUpperCase() + " - " + formatDate(set.released_at));
    setArtist(set);
    setIcon(iconDir + getFileNameFromURL(set.icon_svg_uri));

    exportPNG(textContent);
  }
}

function placeImage(layer, filePath) {
  let file = new File(filePath);
  if (file.exists) {
    try {
      return layer.groupItems.createFromFile(file);
    } catch (e) {
      throw new Error("Error placing file: " + filePath + "\n" + e.message);
    }
  } else {
    throw new Error("File not found: " + filePath);
  }
}

function matchRectangle(placedItem) {
  let iconWrapperLayer = app.activeDocument.layers.getByName("Icon Wrapper");
  if (iconWrapperLayer) {
    let rectangles = iconWrapperLayer.pathItems;
    for (let i = 0; i < rectangles.length; i++) {
      if (rectangles[i].typename === "PathItem" && rectangles[i].closed) {
        let rectangle = rectangles[i];
        let rectWidth = rectangle.width;
        let rectHeight = rectangle.height;
        let rectPosition = rectangle.position;

        // Resize the placed item to match the rectangle height
        let scaleFactor = (rectHeight / placedItem.height) * 100;
        placedItem.resize(scaleFactor, scaleFactor);

        // Move the placed item to center it within the rectangle
        let newWidth = placedItem.width;
        let newHeight = placedItem.height;

        let newPositionX = rectPosition[0] + (rectWidth - newWidth) / 2;
        let newPositionY = rectPosition[1] - (rectHeight - newHeight) / 2;

        placedItem.position = [newPositionX, newPositionY];

        // Align the right edge of placedItem with the right edge of the rectangle
        let rightEdgeX = rectPosition[0] + rectWidth;
        placedItem.position = [rightEdgeX - newWidth, newPositionY];

        break;
      }
    }
  } else {
    throw new Error("Icon Wrapper layer not found");
  }
}

function exportPNG(textContent) {
  let fileName = textContent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let exportFile = new File(outputPath + fileName + ".png");

  let exportOptions = new ExportOptionsPNG24();
  exportOptions.artBoardClipping = true;
  exportOptions.verticalScale = 1000; // Higher scale for better resolution
  exportOptions.horizontalScale = 1000; // Higher scale for better resolution

  try {
    app.activeDocument.exportFile(exportFile, ExportType.PNG24, exportOptions);
    $.writeln("Exported: " + exportFile.fsName);
  } catch (e) {
    throw new Error(
      "Error exporting file: " + exportFile.fsName + "\n" + e.message,
    );
  }
}

// Main script execution
try {
  let csvData = readCSVFile();
  if (csvData) {
    let layersData = parseCSV(csvData);
    updateContent(layersData);
  } else {
    throw new Error("No CSV file found or unable to read the file.");
  }
} catch (e) {
  alert("Script halted due to error: " + e.message);
  $.writeln("Error: " + e.message);
}
