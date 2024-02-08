const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const app = express();
const port = 3005;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.get("/", (req, res) => {
  res.send("Hello World!");
});

let db = {};

async function saveFramesToVideo(frames, frameRate) {
  const fs = require("fs");
  const { execSync } = require("child_process");

  // Write frames to disk
  const frameDir = "./frames";
  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir);
  }

  frames.forEach((frame, index) => {
    fs.writeFileSync(`${frameDir}/frame-${index}.png`, frame);
  });

  // Use FFmpeg to create a video from the frames
  execSync(
    `ffmpeg -framerate ${frameRate} -i ${frameDir}/frame-%d.png -c:v libx264 -r 30 -pix_fmt yuv420p output.mp4`
  );

  // Optionally, clean up frames
  fs.rmdirSync(frameDir, { recursive: true });
}

async function captureAnimation(url, duration, id) {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  // Navigate the page to a URL
  await page.goto(url);

  // Set screen size
  await page.setViewport({ width: 1280, height: 720 });

  const searchResultSelector = "#record-video-button";
  const element = await page.waitForSelector(searchResultSelector);
  // console.log("### element", element);
  await element.click();
  await new Promise((resolve) => setTimeout(resolve, duration * 1000));

  await new Promise((resolve) => {
    const intervalId = setInterval(() => {
      if (db[id] === true) {
        resolve();
        clearInterval(intervalId);
      }
    }, 1000);
  });

  console.log("#### record video execution completed. Browser will now close");
  await browser.close();
}

app.post("/record-video", async (req, res) => {
  const { videoDuration, id, framePerSecond } = req.body;
  console.log("### req in record-video", req.body);
  db[id] = false;

  await captureAnimation(
    `http://localhost:3000/?duration=${videoDuration}?fps=${framePerSecond}?videoId=${id}`,
    videoDuration,
    id
  );

  console.log("### record-video req ends here");
  res.status(200).send("Recording started");
});

app.post("/make-video", async (req, res) => {
  console.log("#### req in make-video", req.body);
  // const { videoDuration, framePerSecond, framesData, videoId } = req.body;

  let frames = [];
  // const secondsArray = Object.keys(framesData);
  // for (var i = 0; i < secondsArray.length; i++) {
  //   const milliFramesArray = Object.keys(framesData[secondsArray[i]]);
  //   console.log("### milliFramesArray", milliFramesArray);

  //   for (var j = 0; j < milliFramesArray.length; j++) {
  //     console.log("### j", milliFramesArray[j]);
  //     const blob = framesData[secondsArray[i]][milliFramesArray[j]];
  //     console.log("### blob", blob);
  //     const reader = new FileReader();
  //     const res = reader.readAsArrayBuffer(blob);
  //     console.log("### res", res);
  //     const buf = await blob.arrayBuffer();
  //     console.log("### buf", buf);
  //     frames.push(milliFramesArray[j]);
  //   }
  // }

  // db[videoId] = true;
  //frameRate = framePerSecond;
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// app.post("/upload-frame", (req, res) => {
//   // Receive frame data and save it
//   // Example: save as a sequence of images
//   console.log("### req", req.body);

//   //   After receiving all frames, use FFmpeg to compile them into a video
//   exec(
//     "ffmpeg -framerate 24 -i image-%d.png output.mp4",
//     (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error: ${error}`);
//         return;
//       } else {
//         res.status(200).send("Video compiled successfully");
//       }
//       // Video compiled successfully
//       // Handle the compiled video (save or send to client)
//     }
//   );
// });

//   const aHandle = await page.evaluateHandle(() => document.body);
//   const resultHandle = await page.evaluateHandle(
//     (body) => body.innerHTML,
//     aHandle
//   );

//   await resultHandle.dispose();
//   console.log("#### aHandle", aHandle);

//   const res = await resultHandle.jsonValue();
//   console.log("#### res", res);
//   const frames = [];
//   const frameRate = 60;
//   const frameInterval = 1000 / frameRate;
//   const seconds = 2;
//   let count = 0;

//   const captureFrame = async () => {
//     console.log("### here");
//     const frame = await page.screenshot();
//     console.log("### frame", frame);
//     frames.push(frame);
//   };

//   await new Promise((resolve) => {
//     const zz = setInterval(() => {
//       count++;
//       captureFrame();

//       if (count === frameRate * seconds) {
//         clearInterval(zz);
//         resolve();
//       }
//     }, frameInterval);
//   });

//   await new Promise((resolve) => setTimeout(resolve, 10000));

//   saveFramesToVideo(frames, frameRate);

//   console.log("### frames", frames);
//   console.log("### frames.length", frames.length);

//   await browser.close();

// Type into search box
//   await page.type(".devsite-search-field", "automate beyond recorder");

// Wait and click on first result

// Dispose of handle
//   await element.dispose();

// Close browser.
