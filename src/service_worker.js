import * as tf from '@tensorflow/tfjs';

const pistols_weights = '/pistol_web_model/model.json';
const weapons_weights = '/weapons_web_model/model.json';

const FIVE_SECONDS_IN_MS = 5000;
const MIN_SCORE_TO_FILETER = 0.34;

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name === "images");
  port.onMessage.addListener(function(msg) {
    if (msg.action == 'img_find') {
      handleImageMsg(msg, port);
    }
  });
});

function postResults(port, results, img) {
  if (shouldHide(img, results) == true) {
    port.postMessage({ src: img });
  }
}

async function handleImageMsg(msg, port) {
  const img = msg.image_src;
  handleImage(img, (results) => { postResults(port, results, img); });
}

function shouldHide(img, results) {
  console.log(`shouldHide ${img} : ${results.valid_detections_data}`);
  for (i = 0; i < results.valid_detections_data; ++i){
    const score = results.scores_data[i].toFixed(2);
    console.warn(`Found a pistol or weapon! score: ${score} - ${img}`);
    if (score >= MIN_SCORE_TO_FILETER) {
      return true;
    }
  }
  return false;
}

async function getImageData(url) {
  try {
      const response = await fetch(url)
      const imgBlob = await response.blob()
      const imgBitmap = await createImageBitmap(imgBlob)
      const pxl_width = imgBitmap.width;
      const pxl_height = imgBitmap.height
      const canvas_width = Math.max(416, pxl_width)
      const canvas_height = Math.max(416, pxl_height)
      var canvas = new OffscreenCanvas(canvas_width, canvas_height);
      var ctx = canvas.getContext("2d");
      return createImageBitmap(imgBitmap, {
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none',
          resizeWidth: pxl_width,
          resizeHeight: pxl_height,
          resizeQuality: "high",
      }).then((btmp_i) => {
          ctx.drawImage(btmp_i, 0, 0);
          return [ctx.getImageData(0, 0, canvas_width, canvas_height), canvas_width, canvas_height]; 
      });
  } catch (e) {
      console.log(`getResizedImageBlob failed for ${url} : ${e}.`);
      return [undefined, 0, 0];
  }
}

async function handleImage(imageUrl, publishResults) {
  const [image, width, height] = await getImageData(imageUrl)
  if(image) {
    const imageData = new ImageData(
      Uint8ClampedArray.from(Array.from(image.data)), width, height);
    const results = imageClassifier.analyzeImage(imageUrl, imageData);
    results.then( (results) => {
      publishResults(results);
    })
  }
}

class ImageClassifier {
  constructor() {
    this.loadModel();
  }

  async loadModel() {
    console.log('Loading model...');
    const startTime = performance.now();
    try {
      this.pistols_model = await tf.loadGraphModel(pistols_weights);
      let [modelWidth, modelHeight] = this.pistols_model.inputs[0].shape.slice(1, 3);
      this.pistols_modelWidth = modelWidth;
      this.pistols_modelHeight = modelHeight;
      // Warms up the model by causing intermediate tensor values
      // to be built and pushed to GPU.
      const input = tf.tidy(() => { return tf.zeros([1, this.pistols_modelWidth, this.pistols_modelHeight, 3]); });
      await this.pistols_model.executeAsync(input);

      this.weapons_model = await tf.loadGraphModel(weapons_weights);
      let [weapons_modelWidth, weapons_modelHeight] = this.weapons_model.inputs[0].shape.slice(1, 3);
      this.weapons_modelWidth = weapons_modelWidth;
      this.weapons_modelHeight = weapons_modelHeight;
      // Warms up the model by causing intermediate tensor values
      // to be built and pushed to GPU.
      const weapons_input = tf.tidy(() => { return tf.zeros([1, this.weapons_modelWidth, this.weapons_modelHeight, 3]); });
      await this.weapons_model.executeAsync(weapons_input);

      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Models loaded and initialized in ${totalTime} ms...`);
    } catch (e) {
      console.error('Unable to load model', e);
    }
  }

  async doInference(input, log_message, model, found_message) {
    const startTime = performance.now();
    const res = await model.executeAsync(input);
    const [boxes, scores, classes, valid_detections] = res;
    const totalTime = performance.now() - startTime;
    console.log(log_message + ` ${totalTime.toFixed(1)} ms `);
    const boxes_data = boxes.dataSync();
    const scores_data = scores.dataSync();
    const classes_data = classes.dataSync();
    const valid_detections_data = valid_detections.dataSync()[0];
    const results = {boxes_data, scores_data, classes_data, valid_detections_data};
    tf.dispose(res)
    if (valid_detections_data > 0) {
      console.log(found_message);
    }
    return results
  }

  async analyzeImage(imageUrl, imageData) { //, url, tabId) {
    if (!this.pistols_model || !this.weapons_model) {
      console.log('Waiting for models to load...');
      setTimeout(
          () => {this.analyzeImage(imageUrl, imageData)}, FIVE_SECONDS_IN_MS);
        return;
    }
    const [modelWidth, modelHeight] = [640, 640]

    console.log('Predicting...');
    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(imageData);
  
      // padding image to square => [n, m] to [n, n], n > m
      const [h, w] = img.shape.slice(0, 2); // get source width and height
      const maxSize = Math.max(w, h); // get max size
      const imgPadded = img.pad([
        [0, maxSize - h], // padding y [bottom only]
        [0, maxSize - w], // padding x [right only]
        [0, 0],
      ]);

      return tf.image
        .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
        .div(255.0) // normalize
        .expandDims(0); // add batch
    });

    var results = await this.doInference(input, 'First inference done in', this.weapons_model, `Found a weapon in ${imageUrl}`)
    if (results.valid_detections_data > 0) {
      return results
    }
    return await this.doInference(input, 'Second inference done in', this.pistols_model, `Found a pistol in ${imageUrl}`);
  }
}

const imageClassifier = new ImageClassifier();
