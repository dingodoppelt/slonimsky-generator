// Global Constants
const OCTAVE_DISPLACEMENT = 2;
const NODE_START_OFFSET = 48;

function calcSemitones(first, second) {
  return second - first;
}

/**
 * convertToAbcString - Converts an array of notes into the ABC string format
 * 
 * @param {[]} data - array of note numbers
 * @returns {string} - abcjs string format
 */

function convertToAbcString(data, beams, breaks) {
  const midiNotes = [
    //bb  b   =   #   X
    [ 9, 10, 11,  0,  1],  // b
    [ 7,  8,  9, 10, 11],  // a
    [ 5,  6,  7,  8,  9],  // g
    [ 3,  4,  5,  6,  7],  // f
    [ 2,  3,  4,  5,  6],  // e
    [ 0,  1,  2,  3,  4],  // d
    [10, 11,  0,  1,  2],  // c
  ];
  let compiled = "M:\nL: 1/16\n";
  let noteCount = 1;
  // Buffer for saving accidentals within the bar
  let accBuffer = {};
  let octBuffer = false;
  
  // Regex für Vorzeichen, Note und Oktave
  const noteRegex = /^(?<accidental>[_^=]?)(?<note>[a-gA-G])(?<octave>[',]*)$/;
  
  // reconstruct interpolation intervals
  let interpolationIntervals = [];
  for (let i=0; i < beams-1; i++) {
    interpolationIntervals[i] = data[i+1] - data[0];
  }
  console.log(interpolationIntervals);
  
  for (let i = 0; i < data.length; i+=beams) {
    let motiv = [];
    let oor = 0; // out of range
    let stringBuf = "";
    for (let x=0; x < beams; x++) {
      motiv[x] = data[i+x];
    }
    
    for (let j = 0; j < beams; j++) {
      let converted = convertNumberToNote(motiv[j]);
      const match = converted.match(noteRegex);
      let accidental = "", note = "", octave = "";
      
      if (match && match.groups) {
        accidental = match.groups.accidental;
        note = match.groups.note;
        octave = match.groups.octave;
      }
      
      // Handle sharps and naturals
      if (/^[\^_]/.test(converted)) {
        accBuffer[note] = true;
      } else {
        // If previously sharp, and now natural, add '='
        if (accBuffer[note]) {
          converted = "=" + note + octave;
          accBuffer[note] = false;
        }
      }
      if (compress.checked === true) {
        if (motiv[j] > 90) oor++;
        if (motiv[j] < 53) oor--;
      }
      stringBuf += converted;
      
      // Draw a barline every X notes
      if (noteCount % breaks === 0) {
        stringBuf += '|\n';
        accBuffer = {}; // Reset buffer at barline
      }
      noteCount++;
    }
    if (oor > 1 && !octBuffer) {
      compiled += '[K:octave=-1][I:MIDI=transpose 12]"^8va Start"';
      octBuffer = true;
    }
    if (oor < -1 && !octBuffer) {
      compiled += '[K:octave=1][I:MIDI=transpose -12]"^8vb Start"';
      octBuffer = true;
    }
    if ((oor > -2 && oor < 2) && octBuffer) {
      compiled += '[K:octave=0][I:MIDI=transpose 0]"^End"';
      octBuffer = false;
    }

    stringBuf += " " // Beamgroups
    compiled += stringBuf;
  }
  compiled += '|\n';
  console.log(compiled);
  return compiled;
}



/**
 * convertNumberToNote - Converts midi note number to readable note name
 * 
 * @param {*} number - midi note number
 * @returns 
 */

function convertNumberToNote(number) {
  const noteNames = [
    ['C', '_D', 'D', '_E', 'E', 'F', '^F', 'G', '_A', 'A', '_B', 'B'],
    ['c', '_d', 'd', '_e', 'e', 'f', '^f', 'g', '_a', 'a', '_b', 'b']
  ];
  
  const octaveIndex = Math.floor(number / 12) - 1;
  const noteIndex = number % 12;
  
  const useLowerCase = octaveIndex >= 5;
  const name = noteNames[useLowerCase ? 1 : 0][noteIndex];
  
  let octaveSuffix = '';
  if (octaveIndex < 4) {
    octaveSuffix = ','.repeat(4 - octaveIndex);
  } else if (octaveIndex > 5) {
    octaveSuffix = '\''.repeat(octaveIndex - 5);
  }
  
  return name + octaveSuffix;
}



/**
 * generateScale - Generates the scales!
 * 
 * @param divisions - the base interval between each node
 * @param {int} start - which note number should we start on?
 * @param {int} nodes - the number of nodes to add
 * @param {int} interpolation - the number of interpolations to add
 * @param {array} interpolationIntervals - An array that contains each interval from the node
 * @returns {array} of notes to be drawn
 */

function generateScale(divisions, start, nodes, interpolation, interpolationInterval) {
  
  if (divisions <= 0) return;
  if (nodes <= 0) return;
  
  let scaleArray = [];
  let startingNote = start + NODE_START_OFFSET;
  
  // add the nodes base note to the scale array
  for (i = 0; i < nodes; i++) {
    
    scaleArray.push(startingNote + (i * divisions));
    
    // add each of the interpolations to the scale array
    for (x = 0; x < interpolation; x++) {
      scaleArray.push(startingNote + (i * divisions) + interpolationInterval[x]);
    }
  }
  return scaleArray; 
}


/**
 * compileAbcString - Collects all the user input, generate the scale and the abc string
 * 
 * @returns ABC string to be passed to the visualiser or playback
 */

function compileAbcString() {
  
  // Collect all the values from the DOM
  const divisions = parseInt(divisionInput.value);
  const starting = parseInt(startingNote.value)
  const nodes = parseInt(numberOfNodes.value)
  const interpolation = parseInt(interpolationInput.value)
  const interpolationInterval = [parseInt(interpolationIntervalInput1.value), parseInt(interpolationIntervalInput2.value), parseInt(interpolationIntervalInput3.value), parseInt(interpolationIntervalInput4.value)]
  
  // Control which interpolation interval inputs the user can edit
  disableInterpolationInputs(interpolation)
  
  // Generate the scale and if reverse is checked, append the reversed array
  let noteArray = generateScale(divisions, starting, nodes, interpolation, interpolationInterval);
  if (descending.checked === true) noteArray = noteArray.concat([...noteArray].reverse());
  
  // choose sane numbers for linebreaks
  let beams = interpolation + 1;
  let breaks = beams * nodes;
  while (breaks > 60) {
    breaks -= beams;
  }
  // Convert to ABC and return
  const abcString = convertToAbcString(noteArray, beams, breaks);
  return abcString;
}


/**
 * disableInterpolationInputs - controls how many of the interval inputs are editable
 * 
 * @param {int} number 
 */

function disableInterpolationInputs(number) {
  
  // Disable them all
  interpolationIntervalInput1.disabled = true;
  interpolationIntervalInput2.disabled = true;
  interpolationIntervalInput3.disabled = true;
  interpolationIntervalInput4.disabled = true;
  
  // Enable them one by one
  if(number >= 4) interpolationIntervalInput4.disabled = false;
  if(number >= 3) interpolationIntervalInput3.disabled = false;
  if(number >= 2) interpolationIntervalInput2.disabled = false;
  if(number >= 1) interpolationIntervalInput1.disabled = false;
}


/**
 * drawNotation is called when a change is made to the user inputs, updates the notation
 * 
 */

function drawNotation() {    
  const abcString = compileAbcString();
  var visualOptions = { 
    //responsive: 'resize',
    staffwidth: window.innerWidth,
    wrap: {
      minSpacing: 2.5,
      maxSpacing: 4,
      preferredMeasuresPerLine: 1
    },
    // scale: 1.8
    
  };
  var visualObj = ABCJS.renderAbc("paper", abcString, visualOptions);
}


/**
 * play - generates the ABC string and starts playback
 *  
 * from basic playback example in abcjs lib
 */

function play() {
  if (ABCJS.synth.supportsAudio()) {
    
    let abc = compileAbcString();
    let visualObj = ABCJS.renderAbc("*", abc)[0];
    
    let midiBuffer = new ABCJS.synth.CreateSynth();
    midiBuffer.init({
      //audioContext: new AudioContext(),
      visualObj: visualObj,
      // sequence: [],
      millisecondsPerMeasure: 2000,
      // debugCallback: function(message) { console.log(message) },
      options: {
        // soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/" ,
        // sequenceCallback: function(noteMapTracks, callbackContext) { return noteMapTracks; },
        // callbackContext: this,
        // onEnded: function(callbackContext),
        // pan: [ -0.5, 0.5 ]
      }
    }).then(function (response) {
      console.log(response);
      midiBuffer.prime().then(function (response) {
        midiBuffer.start();
      });
    }).catch(function (error) {
      console.warn("Audio problem:", error);
    });
  } else {
    document.querySelector(".error").innerHTML = "<div class='audio-error'>Audio is not supported in this browser.</div>";
  }
}


// DOM variable declarations

const divisionInput = document.getElementById("divisions-input");
const startingNote = document.getElementById("starting-input");
const numberOfNodes = document.getElementById("notes-input");
const interpolationInput = document.getElementById("interpolation-input");
const interpolationIntervalInput1 = document.getElementById("interpolation-interval-input1");
const interpolationIntervalInput2 = document.getElementById("interpolation-interval-input2");
const interpolationIntervalInput3 = document.getElementById("interpolation-interval-input3");
const interpolationIntervalInput4 = document.getElementById("interpolation-interval-input4");
const descending = document.getElementById("descending");
const compress = document.getElementById("compress");
