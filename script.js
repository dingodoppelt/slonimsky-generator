// Global Constants
const OCTAVE_DISPLACEMENT = 2;
const NODE_START_OFFSET = 48;


/**
 * convertToAbcString - Converts an array of notes into the ABC string format
 * 
 * @param {[]} data - array of note numbers
 * @returns {string} - abcjs string format
 */

function convertToAbcString(data, beams, breaks) {
    let compiled = "M:\nL: 1/16\n";
    let noteCount = 1;
    // Buffer for saving accidentals within the bar
    let accBuffer = {};
    let octBuffer = false;

    for (let i = 0; i < data.length; i++) {
        let converted = convertNumberToNote(data[i]);
        let natural = converted.replace(/[_^]/g, ""); // Extract note letter

        // Handle sharps and naturals
        if (/^[\^_]/.test(converted)) {
            accBuffer[natural] = true;
        } else {
            // If previously sharp, and now natural, add '='
            if (accBuffer[natural]) {
                converted = "=" + natural;
                accBuffer[natural] = false;
            }
        }
        if (compress.checked === true) {
          if (data[i] > 90 && !octBuffer) {
            compiled += '[K:octave=-1][I:MIDI=transpose 12]"^8va Start"';
            octBuffer = true;
          }
          if (data[i] <= 90 && octBuffer) {
            compiled += '[K:octave=0][I:MIDI=transpose 0]"^8va End"';
            octBuffer = false;
          }
        }
        compiled += converted;

        // Beam every X notes
        if (noteCount % beams === 0) compiled += " ";
        // Draw a barline every X notes
        if (noteCount % breaks === 0) {
            compiled += '|\n';
            accBuffer = {}; // Reset buffer at barline
        }
        noteCount++;
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
  return convertToAbcString(noteArray, beams, breaks);
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
