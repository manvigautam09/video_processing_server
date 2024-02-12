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
    `ffmpeg -framerate ${frameRate} -i ${frameDir}/frame-%d.png -c:v libx264 -r 30 -pix_fmt yuv420p public/output.mp4`
  );

  // Optionally, clean up frames
  fs.rmdirSync(frameDir, { recursive: true });
}

async function captureAnimation(url, duration, id) {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
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

app.post("/make-video", upload.array("files"), async (req, res) => {
  const { videoDuration, framePerSecond, framesData, videoId } = req.query;

  let frames = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];

    const imgData = await new Promise((res, rej) => {
      fs.readFile(file.path, (err, buffer) => {
        if (err) {
          rej(err);
        }

        res(buffer);
      });
    });

    frames.push(imgData);
  }

  saveFramesToVideo(frames, framePerSecond);

  db[videoId] = true;
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
