// Import color utility functions
import {
  nameToHex,
  hex2rgb,
  rgb2hsv,
  HSVtoRGB,
  HSVtoRGB2,
  getContrastYIQ,
  rgbToHex,
  rgb
} from './colorUtils.js';

// Import geometry functions
import {
  Point,
  calculateRotationMatrix,
  applyMatrixToPoint,
  roundTowardZero
} from './geometry.js';

// Import audio functions
import {
  initAudio,
  loadSample,
  playNote,
  stopNote,
  getMidiFromCoords,
  setSampleFadeout,
  getSampleBuffer,
  getAudioContext
} from './audioHandler.ts';

// Import event handling functions
import {
  initEventHandlers,
  removeEventHandlers
} from './eventHandler.js';

// Import hex utility functions
import {
  initHexUtils,
  hexCoordsToCents,
  getHexCoordsAt,
  hexCoordsToScreen
} from './hexUtils.ts';

// Import display utility functions
import {
  initDisplayUtils,
  centsToColor,
  current_text_color
} from './displayUtils.js';

// Global variables
let is_key_event_added;
let myOutput = null;

// Make back function available globally
window.back = back;

if(WebMidi){
  WebMidi
  .enable()
  .then(onEnabled)
  .catch(err => alert(err));
}

function onEnabled() {
  if(WebMidi.outputs){
    let midiOutMenu = document.createElement("optgroup")
    midiOutMenu.setAttribute("label", "MIDI out");
    document.getElementById("instrument").appendChild(midiOutMenu);
    function addMidiOption(e){
      let midiOption = document.createElement("option")
      midiOption.setAttribute("value", e);
      midiOption.textContent = e;
      midiOutMenu.appendChild(midiOption);
    }
    WebMidi.outputs.forEach(output => addMidiOption(output.name));
  }
  //initialize keyboard on load
  if(init_keyboard_onload)
  {
    //hide landing page
    document.getElementById('landing-page').style.display ='none';
    
    document.getElementById("instrument").value = ("instrument" in getData) ? getData.instrument : "organ";
    setTimeout(function(){ goKeyboard(); }, 1500);
  }
  window.addEventListener('beforeunload',(event) =>{
    if (myOutput) {
      myOutput.sendAllSoundOff();
    }
  });
}

//check\set preset
var init_keyboard_onload = true;
if(decodeURIComponent(window.location.search) == '')
{
  init_keyboard_onload = false;
}

checkPreset(16);
// fill in form
document.getElementById('settingsForm').onsubmit = goKeyboard;

var getData = new QueryData(location.search, true);
document.getElementById("fundamental").value = ("fundamental" in getData) ? getData.fundamental : 263.09212;
document.getElementById("rSteps").value = ("right" in getData) ? getData.right : 5;
document.getElementById("urSteps").value = ("upright" in getData) ? getData.upright : 2;
document.getElementById("hexSize").value = ("size" in getData) ? getData.size : 50;
document.getElementById("rotation").value = ("rotation" in getData) ? getData.rotation : 343.897886248;
// document.getElementById("instrument").value = ("instrument" in getData) ? getData.instrument : "organ";  //have to move this to onEnabled(), otherwise the value of #instrument will be set to an option that doesn't exist yet
document.getElementById("enum").checked = ("enum" in getData) ? JSON.parse(getData["enum"]) : false;
document.getElementById("equivSteps").value = ("equivSteps" in getData) ? getData.equivSteps : 31;
document.getElementById("spectrum_colors").checked = ("spectrum_colors" in getData) ? JSON.parse(getData.spectrum_colors) : false;
document.getElementById("fundamental_color").value = ("fundamental_color" in getData) ? getData.fundamental_color : '#55ff55';
document.getElementById("no_labels").checked = ("no_labels" in getData) ? JSON.parse(getData.no_labels) : false;


var global_pressed_interval;

if ("scale" in getData) {
  document.getElementById("scale").value = getData.scale[0];
}

if ("names" in getData) {
  document.getElementById("names").value = getData.names[0];
}

if ("note_colors" in getData) {
  document.getElementById("note_colors").value = getData.note_colors[0];
}

hideRevealNames();
hideRevealColors();
hideRevealEnum();

function hideRevealNames() {
  if (document.getElementById("enum").checked) {
    document.getElementById("equivSteps").style.display = 'block';
    document.getElementById("names").style.display = 'none';
    document.getElementById("numberLabel").style.display = 'block';
    document.getElementById("namesLabel").style.display = 'none';
  } else {
    document.getElementById("equivSteps").style.display = 'none';
    document.getElementById("names").style.display = 'block';
    document.getElementById("numberLabel").style.display = 'none';
    document.getElementById("namesLabel").style.display = 'block';
  }
  changeURL();
}

function hideRevealColors() {
  if (document.getElementById("spectrum_colors").checked) {
    document.getElementById("fundamental_color").style.display = 'block';
    document.getElementById("fundamental_colorLabel").style.display = 'block';
    document.getElementById("note_colors").style.display = 'none';
    document.getElementById("note_colorsLabel").style.display = 'none';

  } else {
    document.getElementById("fundamental_color").style.display = 'none';
    document.getElementById("fundamental_colorLabel").style.display = 'none';
    document.getElementById("note_colors").style.display = 'block';
    document.getElementById("note_colorsLabel").style.display = 'block';
  }

  changeURL();

}

function hideRevealEnum() {
  if (document.getElementById("no_labels").checked) {
    document.getElementById("enum").disabled = true;
    document.getElementById("equivSteps").style.display = 'none';
    document.getElementById("names").style.display = 'none';
    document.getElementById("numberLabel").style.display = 'none';
    document.getElementById("namesLabel").style.display = 'none';
  } else {
    document.getElementById("enum").disabled = false;
    if (!document.getElementById('enum').checked) {
      document.getElementById("namesLabel").style.display = 'block';
      document.getElementById("names").style.display = 'block';
    } else {
      document.getElementById("equivSteps").style.display = 'block';
      document.getElementById("numberLabel").style.display = 'block';
    }
  }
  changeURL();
}

function changeURL() {
  var url = window.location.pathname + "?";
  // add fundamental, right, upright, size

  url += "fundamental=" + document.getElementById("fundamental").value +
    "&right=" + document.getElementById("rSteps").value +
    "&upright=" + document.getElementById("urSteps").value +
    "&size=" + document.getElementById("hexSize").value +
    "&rotation=" + document.getElementById("rotation").value +
    "&instrument=" + document.getElementById("instrument").value +
    "&enum=" + document.getElementById("enum").checked +
    "&equivSteps=" + document.getElementById("equivSteps").value +
    "&spectrum_colors=" + document.getElementById("spectrum_colors").checked +
    "&fundamental_color=" + document.getElementById("fundamental_color").value +
    "&no_labels=" + document.getElementById("no_labels").checked;

  url += "&scale=";
  url += encodeURIComponent(document.getElementById('scale').value);

  url += "&names=";
  url += encodeURIComponent(document.getElementById('names').value);

  url += "&note_colors=";
  url += encodeURIComponent(document.getElementById('note_colors').value);

  // Find scl file description for the page title

  var scaleLines = document.getElementById('scale').value.split('\n');
  var first = true;
  var foundDescription = false;
  var description = "Terpstra Keyboard WebApp";

  scaleLines.forEach(function(line) {
    if (!(foundDescription) && !(line.match(/^\!/)) && line.match(/[a-zA-Z]+/)) {
      foundDescription = true;
      description = line;
    }
  });

  document.title = description;

  window.history.replaceState({}, '', url);
}

var settings = {};

function parseScale() {
  settings.scale = [];
  var scaleLines = document.getElementById('scale').value.split('\n');
  scaleLines.forEach(function(line) {
    if (line.match(/^[1234567890.\s/]+$/) && !(line.match(/^\s+$/))) {
      if (line.match(/\//)) {
        // ratio
        var nd = line.split('/');
        var ratio = 1200 * Math.log(parseInt(nd[0]) / parseInt(nd[1])) / Math.log(2);
        settings.scale.push(ratio);
      } else {
        if (line.match(/\./))
        // cents
          settings.scale.push(parseFloat(line));
      }
    }
  });
  settings.equivInterval = settings.scale.pop();
  settings.scale.unshift(0);
}

function parseScaleColors() {
  settings.keycolors = [];
  var colorsArray = document.getElementById('note_colors').value.split('\n');
  colorsArray.forEach(function(line) {
    settings.keycolors.push(line);
  });
}

function resizeHandler() {
  // Resize Inner and outer coordinates of canvas to preserve aspect ratio

  var newWidth = window.innerWidth;
  var newHeight = window.innerHeight;

  settings.canvas.style.height = newHeight + 'px';
  settings.canvas.style.width = newWidth + 'px';

  settings.canvas.style.marginTop = (-newHeight / 2) + 'px';
  settings.canvas.style.marginLeft = (-newWidth / 2) + 'px';

  settings.canvas.width = newWidth;
  settings.canvas.height = newHeight;

  // Find new centerpoint

  var centerX = newWidth / 2;
  var centerY = newHeight / 2;
  settings.centerpoint = new Point(centerX, centerY);

  // Rotate about it

  if (settings.rotationMatrix) {
    settings.context.restore();
  }
  settings.context.save();

  settings.rotationMatrix = calculateRotationMatrix(-settings.rotation, settings.centerpoint);

  var m = calculateRotationMatrix(settings.rotation, settings.centerpoint);
  settings.context.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

  // Redraw Grid

  drawGrid();
}

function back() {
  // Remove key listener
  removeEventHandlers();
  
  // Stop all active notes
  if (settings && settings.activeHexObjects) {
    while (settings.activeHexObjects.length > 0) {
      var coords = settings.activeHexObjects[0].coords;
      settings.activeHexObjects[0].noteOff();
      drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
      settings.activeHexObjects.splice(0, 1);
    }
  }
  
  if(myOutput){
    myOutput.sendAllSoundOff();
  }
  
  // UI change
  document.getElementById("keyboard").style.display = "none";
  document.getElementById("backButton").style.display = "none";
  document.getElementById("landing-page").style.display = "block";
  document.body.style.overflow = 'scroll';
}

function goKeyboard() {
  changeURL();

  // Set up screen
  document.getElementById("landing-page").style.display = "none";
  document.getElementById("keyboard").style.display = "block";
  document.body.style.overflow = 'hidden';
  document.getElementById("backButton").style.display = "block";

  // Initialize settings object
  window.settings = {};

  // set up settings constants
  settings.fundamental = parseFloat(document.getElementById("fundamental").value) || 263.09212;
  settings.rSteps = parseFloat(document.getElementById("rSteps").value) || 5;
  settings.urSteps = parseFloat(settings.rSteps) - parseFloat(document.getElementById("urSteps").value || 2);
  settings.hexSize = parseFloat(document.getElementById("hexSize").value) || 50;
  settings.rotation = (parseFloat(document.getElementById("rotation").value || 343.897886248) * 2 * Math.PI) / 360;
  parseScale();
  parseScaleColors();
  settings.names = document.getElementById('names').value.split('\n');
  settings["enum"] = document.getElementById('enum').checked;
  settings.equivSteps = parseInt(document.getElementById('equivSteps').value) || 31;

  settings.canvas = document.getElementById('keyboard');
  settings.context = settings.canvas.getContext('2d');

  settings.hexHeight = settings.hexSize * 2;
  settings.hexVert = settings.hexHeight * 3 / 4;
  settings.hexWidth = Math.sqrt(3) / 2 * settings.hexHeight;

  settings.no_labels = document.getElementById('no_labels').checked;
  settings.spectrum_colors = document.getElementById('spectrum_colors').checked;
  settings.fundamental_color = document.getElementById('fundamental_color').value;

  // Initialize all modules with settings
  initHexUtils(settings);
  initDisplayUtils(settings);

  // Set up resize handler
  window.addEventListener('resize', resizeHandler, false);
  window.addEventListener('orientationchange', resizeHandler, false);

  //... and give it an initial call
  resizeHandler();

  // Set up synth
  var instrumentOption = document.getElementById("instrument").selectedIndex;
  var instruments = [{
      fileName: "piano",
      fade: 0.1
    }, {
      fileName: "harpsichord",
      fade: 0.2
    }, {
      fileName: "rhodes",
      fade: 0.1
    }, {
      fileName: "harp",
      fade: 0.2
    }, {
      fileName: "choir",
      fade: 0.5
    }, {
      fileName: "strings",
      fade: 0.9
    }, {
      fileName: "sawtooth",
      fade: 0.2
    }, {
      fileName: "gayageum",
      fade: 1
    }, {
      fileName: "qanun",
      fade: 1
    }, {
      fileName: "organ",
      fade: 0.1
    }, {
      fileName: "organleslie",
      fade: 0.1
    }, {
      fileName: "marimba",
      fade: 0.1
    }, {
      fileName: "musicbox",
      fade: 0.1
    }, {
      fileName: "WMRI3LST",
      fade: 0.1
    }, {
      fileName: "WMRI5LST",
      fade: 0.1
    }, {
      fileName: "WMRI5Lpike",
      fade: 0.1
    }, {
      fileName: "WMRI7LST",
      fade: 0.1
    }, {
      fileName: "WMRI11LST",
      fade: 0.1
    }, {
      fileName: "WMRI13LST",
      fade: 0.1
    }, {
      fileName: "WMRInLST",
      fade: 0.1
    }, {
      fileName: "WMRIByzantineST",
      fade: 0.1
    }, {
      fileName: "WMRI-in6-har7-",
      fade: 0.1
    }, {
      fileName: "WMRI-in7-har6-",
      fade: 0.1
    }
  ];

  if(document.querySelector('#instrument option:checked').parentElement.label == 'MIDI out'){
    myOutput = WebMidi.getOutputByName(document.querySelector('#instrument option:checked').textContent);
    myOutput.sendAllSoundOff();
  } else {
    myOutput = null;
    loadSample(instruments[instrumentOption].fileName, 0);
    setSampleFadeout(instruments[instrumentOption].fade);
  }

  // Initialize event handlers
  settings.sustain = false;
  settings.sustainedNotes = [];
  settings.activeHexObjects = [];
  initEventHandlers(settings);

  return false;
}

window.addEventListener('load', init, false);

function init() {
  settings.audioContext = initAudio();
}

function checkPreset(init) {
  var mselect = document.getElementById('quicklinks');
  var url_str = window.location.href;

  //first check for .htm as end of url and set the default preset (31ET)
  if (url_str.substr(url_str.length - 4) == '.htm') {
    mselect.value = mselect.options[init].value;
  }
  for (var i = 0; i < mselect.length; i++) {
    if (url_str.indexOf(mselect.options[i].value) != -1) {
      //this is the correct preset
      mselect.value = mselect.options[i].value;
    }
  }
}

function noPreset() {
  ms = document.getElementById('quicklinks');
  ms.value = ms.options[0].value;
}

if(!WebMidi){
  //initialize keyboard on load
  if(init_keyboard_onload)
  {
    //hide landing page
    document.getElementById('landing-page').style.display ='none';

    document.getElementById("instrument").value = ("instrument" in getData) ? getData.instrument : "organ";
    setTimeout(function(){ goKeyboard(); }, 1500);
  }
}

function drawHex(p, c) { /* Point, color */

  var hexCenter = hexCoordsToScreen(p);

  // Calculate hex vertices

  var x = [];
  var y = [];
  for (var i = 0; i < 6; i++) {
    var angle = 2 * Math.PI / 6 * (i + 0.5);
    x[i] = hexCenter.x + settings.hexSize * Math.cos(angle);
    y[i] = hexCenter.y + settings.hexSize * Math.sin(angle);
  }

  // Draw filled hex

  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (var i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.fillStyle = c;
  settings.context.fill();

  // Save context and create a hex shaped clip

  settings.context.save();
  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (var i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.clip();

  // Calculate hex vertices outside clipped path

  var x2 = [];
  var y2 = [];
  for (var i = 0; i < 6; i++) {
    var angle = 2 * Math.PI / 6 * (i + 0.5);
    x2[i] = hexCenter.x + (parseFloat(settings.hexSize) + 3) * Math.cos(angle);
    y2[i] = hexCenter.y + (parseFloat(settings.hexSize) + 3) * Math.sin(angle);
  }

  // Draw shadowed stroke outside clip to create pseudo-3d effect

  settings.context.beginPath();
  settings.context.moveTo(x2[0], y2[0]);
  for (var i = 1; i < 6; i++) {
    settings.context.lineTo(x2[i], y2[i]);
  }
  settings.context.closePath();
  settings.context.strokeStyle = 'black';
  settings.context.lineWidth = 5;
  settings.context.shadowBlur = 15;
  settings.context.shadowColor = 'black';
  settings.context.shadowOffsetX = 0;
  settings.context.shadowOffsetY = 0;
  settings.context.stroke();
  settings.context.restore();

  // Add a clean stroke around hex

  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (var i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.lineWidth = 2;
  settings.context.lineJoin = 'round';
  settings.context.strokeStyle = 'black';
  settings.context.stroke();

  // Add note name and equivalence interval multiple

  settings.context.save();
  settings.context.translate(hexCenter.x, hexCenter.y);
  settings.context.rotate(-settings.rotation);
  // hexcoords = p and screenCoords = hexCenter

  //settings.context.fillStyle = "black"; //bdl_04062016
  settings.context.fillStyle = getContrastYIQ(current_text_color);
  settings.context.font = "22pt Arial";
  settings.context.textAlign = "center";
  settings.context.textBaseline = "middle";

  var note = p.x * settings.rSteps + p.y * settings.urSteps;
  var equivSteps = settings["enum"] ? parseInt(settings.equivSteps) : settings.scale.length;
  var equivMultiple = Math.floor(note / equivSteps);
  var reducedNote = note % equivSteps;
  if (reducedNote < 0) {
    reducedNote = equivSteps + reducedNote;
  }

  if (!settings.no_labels) {
    var name = settings["enum"] ? "" + reducedNote : settings.names[reducedNote];
    if (name) {
      settings.context.save();
      var scaleFactor = name.length > 3 ? 3 / name.length : 1;
      scaleFactor *= settings.hexSize / 50;
      settings.context.scale(scaleFactor, scaleFactor);
      settings.context.fillText(name, 0, 0);
      settings.context.restore();
    }

    var scaleFactor = settings.hexSize / 50;
    settings.context.scale(scaleFactor, scaleFactor);
    settings.context.translate(10, -25);
    settings.context.fillStyle = "white";
    settings.context.font = "12pt Arial";
    settings.context.textAlign = "center";
    settings.context.textBaseline = "middle";
    settings.context.fillText(equivMultiple, 0, 0);
  }

  settings.context.restore();
}

export function drawGrid() {
  const max = (settings.centerpoint.x > settings.centerpoint.y) ?
      settings.centerpoint.x / settings.hexSize :
      settings.centerpoint.y / settings.hexSize;
  
  for (let r = -Math.floor(max); r < max; r++) {
    for (let ur = -Math.floor(max); ur < max; ur++) {
      const coords = new Point(r, ur);
      const centsObj = hexCoordsToCents(coords);
      drawHex(coords, centsToColor(centsObj, false));
    }
  }
}