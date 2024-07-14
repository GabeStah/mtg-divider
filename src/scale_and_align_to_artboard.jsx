if (app.documents.length > 0) {
  var doc = app.activeDocument;
  var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
  var selectedItems = doc.selection;

  if (selectedItems.length > 0) {
      var item = selectedItems[0];
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
  } else {
      alert("Please select an object to scale and align.");
  }
} else {
  alert("Please open a document.");
}
