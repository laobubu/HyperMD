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

function printPreview() {
  const preview = document.getElementById("preview");
  if (preview.style.display === "none") {
    preview.style.display = "block";
    Preview.renderPreview(preview, editor.getValue());
  }
  Preview.printPreview(
    preview,
    null,
    [],
    `
  .CodeMirror, #test-box {
    display: none;
  }
  
  body, body.loaded {
    background-color: #fff;
  }  

  .preview.preview {
    box-shadow: none !important;
  }
`
  ).then(() => {
    console.log("printed");
  });
}
