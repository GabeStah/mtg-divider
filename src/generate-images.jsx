const scriptFile = new File($.fileName);
const scriptDir = scriptFile.path;
const rootDir = scriptDir + "/../";

const importPath = rootDir + "data/sets.csv";
const backgroundDir = rootDir + "assets/backgrounds/";
const iconDir = rootDir + "assets/icons/";
const outputPath = rootDir + "output/";

function readCSVFile() {
  var csvFile = new File(importPath);
  if (csvFile.exists) {
    csvFile.encoding = "UTF-8"; // Ensure correct encoding
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
  var headers = parseCSVLine(lines[0]);
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var cells = parseCSVLine(lines[i]);
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

function parseCSVLine(line) {
  var result = [];
  var insideQuote = false;
  var value = "";

  for (var i = 0; i < line.length; i++) {
    var character = line[i];
    if (character === '"' && (i === 0 || line[i - 1] !== "\\")) {
      insideQuote = !insideQuote;
    } else if (character === "," && !insideQuote) {
      result.push(trimWhitespace(value));
      value = "";
    } else {
      value += character;
    }
  }
  result.push(trimWhitespace(value));
  return result;
}

function trimWhitespace(value) {
  if (typeof value === "string") {
    return value.replace(/^\s+|\s+$/g, "");
  }
  return value;
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
      textFrames[j].contents = "";
      if (data.artist) {
        textFrames[j].contents = data.artist;
        if (data.collector_number) {
          textFrames[j].contents += " - CN " + data.collector_number;
        }
      }
    }
  } else {
    throw new Error("Artist layer not found");
  }
}

function setIcon(imagePath) {
  var layer = app.activeDocument.layers.getByName("Icon");
  if (layer) {
    while (layer.pageItems.length > 0) {
      layer.pageItems[0].remove();
    }
    var placedItem = placeImage(layer, imagePath);
    if (placedItem) {
      matchRectangle(placedItem);
    }
  } else {
    throw new Error("Icon layer not found");
  }
}

function setSubtitle(data) {
  var text = data.code.toUpperCase() + " - " + formatDate(data.released_at);
  if (data.parent_set_code) {
    text =
      data.code.toUpperCase() +
      " [" +
      data.parent_set_code.toUpperCase() +
      "] - " +
      formatDate(data.released_at);
  }

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
  if (text.slice(-9) === "Commander") {
    text = text.slice(0, -9) + "(C)";
  }

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
    while (layer.pageItems.length > 0) {
      layer.pageItems[0].remove();
    }
    var placedItem = placeImage(layer, imagePath);
    if (placedItem) {
      fitToArtboard(placedItem);
    }
  } else {
    throw new Error("Background layer not found");
  }
}

function updateContent(data) {
  var imagesGenerated = 0;
  for (var i = 0; i < data.length; i++) {
    // if (i >= 31) break; // Process only the first 5 rows

    var set = data[i];
    var textContent = set.name;

    setTitle(textContent);
    setSubtitle(set);
    setArtist(set);
    setIcon(iconDir + getFileNameFromURL(set.icon_svg_uri));
    setBackground(backgroundDir + set.background); // Assume background field contains the file name

    exportPNG(set.code, textContent);
    imagesGenerated++;
  }
  return imagesGenerated;
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
  try {
    var iconWrapperLayer = app.activeDocument.layers.getByName("Icon Wrapper");
    if (!iconWrapperLayer) {
      throw new Error("Icon Wrapper layer not found");
    }

    var rectangles = iconWrapperLayer.pathItems;
    if (rectangles.length === 0) {
      throw new Error("No rectangles found in Icon Wrapper layer");
    }

    var rectangle = rectangles[0];
    var rectWidth = rectangle.width;
    var rectHeight = rectangle.height;
    var rectPosition = rectangle.position;

    // If placedItem has zero height or width, return early
    if (placedItem.height === 0 || placedItem.width === 0) {
      return;
    }

    var scaleFactor = (rectHeight / placedItem.height) * 100;
    placedItem.resize(scaleFactor, scaleFactor);

    var newWidth = placedItem.width;
    var newHeight = placedItem.height;

    var newPositionX = rectPosition[0] + (rectWidth - newWidth) / 2;
    var newPositionY = rectPosition[1] - (rectHeight - newHeight) / 2;

    placedItem.position = [newPositionX, newPositionY];

    var rightEdgeX = rectPosition[0] + rectWidth;
    placedItem.position = [rightEdgeX - newWidth, newPositionY];
  } catch (e) {
    alert("Error in matchRectangle: " + e.message);
    throw e;
  }
}

function fitToArtboard(item) {
  var artboard = app.activeDocument.artboards[0];
  var artboardRect = artboard.artboardRect;
  var artboardWidth = artboardRect[2] - artboardRect[0];

  var itemWidth = item.width;

  var scaleX = artboardWidth / itemWidth;

  item.resize(scaleX * 100, scaleX * 100);

  var offsetX = artboardRect[0] - item.left;
  var offsetY = artboardRect[1] - item.top;

  item.translate(offsetX, offsetY);
}

function exportPNG(setCode, textContent) {
  var fileName =
    setCode.toLowerCase() +
    "_" +
    textContent
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  var exportFile = new File(outputPath + fileName + ".png");

  var exportOptions = new ExportOptionsPNG24();
  exportOptions.artBoardClipping = true;
  exportOptions.verticalScale = 1000;
  exportOptions.horizontalScale = 1000;

  try {
    app.activeDocument.exportFile(exportFile, ExportType.PNG24, exportOptions);
    $.writeln("Exported: " + exportFile.fsName);
  } catch (e) {
    throw new Error(
      "Error exporting file: " + exportFile.fsName + "\n" + e.message,
    );
  }
}

try {
  var csvData = readCSVFile();
  if (csvData) {
    var layersData = parseCSV(csvData);
    var imagesGenerated = updateContent(layersData);
    alert(imagesGenerated + " images were generated.");
  } else {
    alert("No CSV file found or unable to read the file.");
  }
} catch (e) {
  alert("Script halted due to error: " + e.message);
  $.writeln("Error: " + e.message);
}
