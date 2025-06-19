
const puppeteer = require('puppeteer');
const fs = require('fs');

const meetingId = process.argv[2];
const url = `http://localhost:8080/?room=${meetingId}`;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Join room
  await page.waitForSelector('#roomName');
  await page.type('#roomName', meetingId);
  await page.click('#btnConnect');

  console.log("🤖 Bot joined meeting:", meetingId);

  // Wait for a remote video element to appear
  await page.waitForFunction(() => {
    return [...document.querySelectorAll('video')].some(v => v.id !== 'localVideo');
  }, { timeout: 60000 });

  console.log("🎥 Remote participant joined. Starting recording...");

  await page.exposeFunction('saveAudio', async (base64) => {
    const buffer = Buffer.from(base64, 'base64'); // Step 1: Decode base64 to binary
    fs.writeFileSync('bot-recording.webm', buffer); // Step 2: Save binary as .webm file
    console.log("📥 Audio saved as 'bot-recording.webm'");
  });

await page.evaluate(() => {
  const remoteVideo = [...document.querySelectorAll('video')].find(v => v.id !== 'localVideo');
  remoteVideo.muted = false;
  remoteVideo.play();

  const stream = remoteVideo.srcObject;
  const audioTracks = stream.getAudioTracks();

  if (audioTracks.length === 0) {
    console.error("❌ No audio tracks found in remote video.");
    return;
  }

  const audioStream = new MediaStream(audioTracks);
  const recorder = new MediaRecorder(audioStream);
  let chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      window.saveAudio(base64data);
    };
    reader.readAsDataURL(blob);
  };

  recorder.start();
  console.log("⏺️ Audio-only recording started");

  setTimeout(() => {
    recorder.stop();
    console.log("⏹️ Recording stopped");
  }, 3 * 60 * 1000); // 3 minutes
});


  // Wait for recording to finish
  await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000 + 5000));
  await browser.close();
})();
