function togglePreview(editor) {
  const preview = document.getElementById("preview");
  if (preview.style.display === "none") {
    preview.style.display = "block";
    Preview.renderPreview(preview, editor.getValue());
  } else {
    preview.style.display = "none";
  }
}

function hidePreview() {
  const preview = document.getElementById("preview");
  preview.style.display = "none";
}

function printPDF() {
  const preview = document.getElementById("preview");
  Preview.printPDF(preview);
}
