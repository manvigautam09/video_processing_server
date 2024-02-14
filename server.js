const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const multer = require("multer");
const app = express();
const fs = require("fs");
const path = require("path");

const port = 3005;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.get("/", (req, res) => {
  res.send("Hello World!");
});

const upload = multer({ dest: "uploads/" });

let db = {};

function base64ToArrayBuffer(base64) {
  const base64Data = base64.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  return buffer;
}

async function saveFramesToVideo(frames, frameRate, videoId) {
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
    `ffmpeg -framerate ${frameRate} -i ${frameDir}/frame-%d.png -c:v libx264 -r 30 -pix_fmt yuv420p public/output.mp4`
  );

  // Optionally, clean up frames
  fs.rmdirSync(frameDir, { recursive: true });
  db[videoId] = true;
}

async function captureAnimation(url, duration, id, framePerSecond) {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate the page to a URL
  await page.goto(url);

  // Set screen size
  await page.setViewport({ width: 1280, height: 720 });

  const searchResultSelector = "#record-video-button";
  const element = await page.waitForSelector(searchResultSelector);
  await element.click();

  const selector = `#id-${id}`;
  const videoRecordedDiv = await page.waitForSelector(selector);
  const textContent = await videoRecordedDiv.evaluate((node) => node.innerText);
  console.log("### textContent", textContent);

  if (textContent === "Video recorded") {
    const framesSelector = "#frames-list li";

    const liTexts = await page.$$eval(framesSelector, (liElements) =>
      liElements.map((li) => ({ url: li.textContent.trim(), id: li.id }))
    );

    let frames = [];
    for (var i = 0; i < liTexts.length; i++) {
      let buffer = base64ToArrayBuffer(liTexts[i].url);
      frames.push(buffer);
    }
    console.log("### length", frames.length);

    saveFramesToVideo(frames, framePerSecond, id);
  }

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
    id,
    framePerSecond
  );

  console.log("### record-video req ends here");
  res.status(200).send("Recording started");
});

// Route to serve JSON file
app.get("/json-data", (req, res) => {
  const filePath = path.join(__dirname, "./public/lottie-animation.json"); // Replace with the path to your JSON file

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      // Error handling
      res.status(500).send("Error reading the JSON file");
      return;
    }

    // Parse JSON data and send as response
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (parseError) {
      res.status(500).send("Error parsing JSON data");
    }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
