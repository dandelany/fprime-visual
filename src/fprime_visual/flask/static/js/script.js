// import {render} from "./canvas.js";
// import {render as render2} from "./canvas2.js";
import {renderers} from "./renderers/index.js";

let logsOn = false;
const log = (() => {
  if (logsOn) {
    return console.log.bind(console);
  } else {
    return () => {};
  }
})();


const Program = {
  init() {
    this.bindEvents();
    this.loadFolders();
    this.initLayoutOptions();
  },
  
  bindEvents() {
    // On window resize, reload the graph to re-render with new size
    // todo: could reuse existing graph instead of re-loading it from server
    window
      .addEventListener("resize", deBounce(this.loadFileAndRender.bind(Program), 300));
    
    // On folder (dropdown) change, load the filenames in that folder
    document
      .getElementById("select-folder")
      .addEventListener("change", this.loadFileNames.bind(this));
    
    // On file (dropdown) change, load the file and render the graph
    document
      .getElementById("select-file")
      .addEventListener("change", () => this.loadFileAndRender());

    document
      .getElementById("select-layout")
      .addEventListener("change", () => this.loadFileAndRender());
  
    document
      .getElementById("info-button")
      .addEventListener("click", (event) => this.toggleConfig());

    document
      .getElementById('screenshot-button')
      .addEventListener('click', (event) => this.screenshotCanvas(event));
  },
  initLayoutOptions() {
    const rendererKeys = Object.keys(renderers);
    const rendererLabels = rendererKeys.map(key => renderers[key].name || key);
    this.populateOptions(rendererKeys, '#select-layout', rendererLabels);
  },

  screenshotCanvas(event) {
    // Hacky way to screenshot a Canvas
    // See https://fjolt.com/article/html-canvas-save-as-image
    let imageFormat = "png";

    let canvas = document.querySelector('canvas');
    // Convert our canvas to a data URL
    let canvasUrl = canvas.toDataURL("image/" + imageFormat);
    // Create an anchor, and set the href value to our data URL
    const createEl = document.createElement('a');
    createEl.href = canvasUrl;
    // This is the name of our downloaded file
    createEl.download = document.getElementById('select-file').value.split('.json')[0] + "." + imageFormat;
    // Click the download button, causing a download, and then remove it
    createEl.click();
    createEl.remove();
  },
  
  // Returns a response promise asynchronously
  loadJSON(jsonFile) {
    return fetch('/get-file?file=' + jsonFile)
      // Parse server response into json 
      .then((response) => response.json());
  },

  loadFolders() {
    fetch('/get-folder-list')
      .then((response) => response.json())
      .then(this.handleFolderList.bind(this))
  },

  handleFolderList(response) {
    let element = '#alert';

    if (!response.err) {  
      element = '#canvas-container';
      this.populateOptions(response.folders, '#select-folder');
      this.loadFileNames();
      // Hide folder selection if only one folder is found
      if (response.folders.length == 1) {
        document.getElementById("select-folder-zone").style.display = 'none';
      } else if (response.folders.length > 1) {
        // set examples folder as the default selected option if it exists
        const examplesFolder = response.folders.find(path => path.includes('examples'));
        const selectFolderEl = document.getElementById("select-folder");
        if(examplesFolder) selectFolderEl.value = examplesFolder;
        // trigger change event so event handler is called
        selectFolderEl.dispatchEvent(new Event("change"));

      }
    }

    // Show alert message or canvas.
    document.querySelector(element).classList.add('show');
  },
  
  toggleConfig() {
    if (document.querySelector('canvas').classList.contains('show')) {
      document.querySelector('canvas').classList.remove('show');
      document.querySelector('#alert').classList.add('show');
    } else {
      document.querySelector('#alert').classList.remove('show');
      document.querySelector('canvas').classList.add('show');
    }
  },

  loadFileNames() {
    fetch('/get-file-list?folder=' + this.getFolder())
      .then((response) => response.json())
      .then((data) => {
        this.populateOptions(data.jsonFiles, '#select-file');
        this.loadFileAndRender();
      })
  },

  getFolder() {
    let folder = document.getElementById("select-folder").value;
    // Append trailing slash to ease path concatenation
    if (!folder.endsWith('/')) {
      folder += '/';
    }
    return folder;
  },

  populateOptions (data, selectID, labels) {
    // Create a new <option> in the dropdown for each item in the data
    const options = data.map((path, i) => {
      let label = path.replace(/\.json$/, '');
      if(labels && labels.length > i && labels[i]) {
        label = labels[i];
      }
      return `<option value = "${path}">${label}</option>`;
    });

    document.querySelector(selectID).innerHTML = options.join('');
  },
  
  loadFileAndRender () {
    // load the JSON file selected in the dropdown
    const fileName = document.getElementById('select-file').value;
    if (!fileName) {
      return;
    }
    // Generate file path.
    const path = this.getFolder() + fileName;

    // get the renderer which will render the data
    const rendererKey = document.getElementById('select-layout').value;
    if(!rendererKey) return;
    const render = renderers[rendererKey].render;

    // Load JSON graph file and render
    const loadingJSON = this.loadJSON(path);
    // loadingJSON.then(render2);
    loadingJSON.then(render);
  }
};

Program.init();
