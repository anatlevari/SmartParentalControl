const LOW_CONFIDENCE_THRESHOLD = 0.01;

const sentImages = new Set();
const minImageSizePx = 20;

var port = chrome.runtime.connect({name: "images"});

function removeImage(image) {
  if (image) {
      image.parentElement.removeChild(image);
  }
}

function sendImages() {
  var imgs = document.getElementsByTagName("img");
  for (var i = 0; i < imgs.length; i++) {
      const img = imgs[i]
      if (!img.src || img.src == "") {
        continue;
      }
      if (img.width < minImageSizePx || img.height < minImageSizePx) {
        console.log("Skipping small image " + img.src)
        continue;
      } 
      if (sentImages.has(img.src)) {
        continue;
      }
      
      sentImages.add(img.src);

      chrome.storage.local.get(img.src, async (res) => {
        const imgKey = img.src.toString();
        var result = res[imgKey];
        if (!result) {
          port.postMessage({action: "img_find", image_src: img.src});
        } else {
          console.log("Found old inference!");
          removeImage(img)
        }
    });
  }
}

port.onMessage.addListener(
  function(imageResult) {
    img_name = imageResult['src'].substring(imageResult['src'].indexOf('/')+1);
    console.log(`got response for image - ${img_name}`)
    const imgKey = imageResult['src'].toString();
    chrome.storage.local.set({[imgKey]: true}, () => {
      console.log("Stored result for " + imgKey)
    });
    console.log("Trying to remove " + img_name)
    removeImage(document.querySelector("img[src$='"+ img_name + "']"));
  }
);

var observer = new MutationObserver(function(mutation) {
  sendImages();
});

observer.observe(document.documentElement, { childList: true, subtree: true });