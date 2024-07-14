const scriptFile = new File($.fileName);
const scriptDir = scriptFile.path;
const rootDir = scriptDir + "/../";

// Define relative paths
const importPath = rootDir + "data/sets.csv";
const backgroundDir = rootDir + "assets/backgrounds/";
const iconDir = rootDir + "assets/icons/";
const outputPath = rootDir + "output/";

function readCSVFile() {
  var csvFile = new File(importPath);
  if (csvFile.exists) {
    csvFile.open("r");
    var content = csvFile.read();
    csvFile.close();
    return content;
  } else {
    throw new Error("CSV file not found: " + importPath);
  }
}

function parseCSV(data) {
  var lines = data.split("\n");
  var headers = lines[0].split(",");
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    // Start at 1 to skip the header row
    var cells = lines[i].split(",");
    if (cells.length === headers.length) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = cells[j];
      }
      result.push(obj);
    }
  }
  return result;
}

function getFileNameFromURL(url) {
  var parts = url.split("/");
  var fileNameWithParams = parts[parts.length - 1];
  return fileNameWithParams.split("?")[0];
}

function formatDate(dateStr) {
  var dateParts = dateStr.split("-");
  var year = dateParts[0];
  var month = dateParts[1];
  var monthNames = [
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
  var monthName = monthNames[parseInt(month, 10) - 1];
  return monthName + " " + year;
}

function setArtist(data) {
  var layer = app.activeDocument.layers.getByName("Artist");
  if (layer) {
    var textFrames = layer.textFrames;
    for (var j = 0; j < textFrames.length; j++) {
      if (data.artist) {
        textFrames[j].contents = data.artist;
        if (data.collector_number) {
          textFrames[j].contents += " - CN " + data.collector_number;
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
  var layer = app.activeDocument.layers.getByName("Icon");
  if (layer) {
    // Remove existing content
    while (layer.pageItems.length > 0) {
      layer.pageItems[0].remove();
    }
    // Place new SVG using createFromFile
    var placedItem = placeImage(layer, imagePath);
    if (placedItem) {
      // Match the position and dimensions of the rectangle in the Icon Wrapper layer
      matchRectangle(placedItem);
    }
  } else {
    throw new Error("Icon layer not found");
  }
}

function setSubtitle(text) {
  var layer = app.activeDocument.layers.getByName("Subtitle");
  if (layer) {
    var textFrames = layer.textFrames;
    for (var i = 0; i < textFrames.length; i++) {
      textFrames[i].contents = text;
    }
  } else {
    throw new Error("Subtitle layer not found");
  }
}

function setTitle(text) {
  var layer = app.activeDocument.layers.getByName("Title");
  if (layer) {
    var textFrames = layer.textFrames;
    for (var i = 0; i < textFrames.length; i++) {
      textFrames[i].contents = text;
    }
  } else {
    throw new Error("Title layer not found");
  }
}

function setBackground(imagePath) {
  var layer = app.activeDocument.layers.getByName("Background");
  if (layer) {
    // Remove existing content
    while (layer.pageItems.length > 0) {
      layer.pageItems[0].remove();
    }
    // Place new image using createFromFile
    var placedItem = placeImage(layer, imagePath);
    if (placedItem) {
      // Fit the image to the width of the artboard and position it at the top
      fitToArtboard(placedItem);
    }
  } else {
    throw new Error("Background layer not found");
  }
}

function updateContent(data) {
  for (var i = 0; i < data.length; i++) {
    if (i >= 2) break; // Process only the first 2 rows

    var set = data[i];
    var textContent = set.name;

    setTitle(textContent);
    setSubtitle(set.code.toUpperCase() + " - " + formatDate(set.released_at));
    setArtist(set);
    setIcon(iconDir + getFileNameFromURL(set.icon_svg_uri));
    setBackground(backgroundDir + set.background); // Assume background field contains the file name

    exportPNG(textContent);
  }
}

function placeImage(layer, filePath) {
  var file = new File(filePath);
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
  var iconWrapperLayer = app.activeDocument.layers.getByName("Icon Wrapper");
  if (iconWrapperLayer) {
    var rectangles = iconWrapperLayer.pathItems;
    for (var i = 0; i < rectangles.length; i++) {
      if (rectangles[i].typename === "PathItem" && rectangles[i].closed) {
        var rectangle = rectangles[i];
        var rectWidth = rectangle.width;
        var rectHeight = rectangle.height;
        var rectPosition = rectangle.position;

        // Resize the placed item to match the rectangle height
        var scaleFactor = (rectHeight / placedItem.height) * 100;
        placedItem.resize(scaleFactor, scaleFactor);

        // Move the placed item to center it within the rectangle
        var newWidth = placedItem.width;
        var newHeight = placedItem.height;

        var newPositionX = rectPosition[0] + (rectWidth - newWidth) / 2;
        var newPositionY = rectPosition[1] - (rectHeight - newHeight) / 2;

        placedItem.position = [newPositionX, newPositionY];

        // Align the right edge of placedItem with the right edge of the rectangle
        var rightEdgeX = rectPosition[0] + rectWidth;
        placedItem.position = [rightEdgeX - newWidth, newPositionY];

        break;
      }
    }
  } else {
    throw new Error("Icon Wrapper layer not found");
  }
}

function fitToArtboard(item) {
  var artboard = app.activeDocument.artboards[0];
  var artboardRect = artboard.artboardRect;
  var artboardWidth = artboardRect[2] - artboardRect[0];

  var itemWidth = item.width;

  // Calculate the scale factor to fit the width of the artboard
  var scaleX = artboardWidth / itemWidth;

  // Scale the item uniformly
  item.resize(scaleX * 100, scaleX * 100);

  // Move the item to the top of the artboard
  var offsetX = artboardRect[0] - item.left;
  var offsetY = artboardRect[1] - item.top;

  item.translate(offsetX, offsetY);
}

function exportPNG(textContent) {
  var fileName = textContent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  var exportFile = new File(outputPath + fileName + ".png");

  var exportOptions = new ExportOptionsPNG24();
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
  var csvData = readCSVFile();
  if (csvData) {
    var layersData = parseCSV(csvData);
    updateContent(layersData);
  } else {
    alert("No CSV file found or unable to read the file.");
  }
} catch (e) {
  alert("Script halted due to error: " + e.message);
  $.writeln("Error: " + e.message);
}
