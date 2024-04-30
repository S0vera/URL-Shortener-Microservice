require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const validUrl = require('valid-url');
const mongoose = require('mongoose')
const crypto = require('crypto');
// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});
function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
}
function checkUnique(shortenedUrl) {
  return new Promise((resolve, reject) => {
      urls.find({ shortenedUrl: shortenedUrl }).then((foundUrls) => {
          if (foundUrls.length > 0) {
              // If shortened URL already exists, recursively generate a new one
              resolve(checkUnique(generateRandomString(6)));
          } else {
              // If shortened URL is unique, resolve with the URL
              resolve(shortenedUrl);
          }
      }).catch((err) => {
          console.error(err);
          reject(err);
      });
  });
}


app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const urlSchema = new mongoose.Schema({
  url:{
    type: String,
    required: true
  },
  shortenedUrl:{
    type: String,
    required: true
  }
})

const urls = mongoose.model("url", urlSchema);
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});
app.post('/api/shorturl', async (req, res) => {
  const url = req.body.url;

  // Check if the URL is valid
  if (!validUrl.isUri(url)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Check if the URL already exists in the database
    const existingUrl = await urls.findOne({ url: url });

    if (existingUrl) {
      // If the URL already exists, return its shortened version
      return res.json({ original_url: existingUrl.url, short_url: existingUrl.shortenedUrl });
    }

    // Generate a unique shortened URL
    const shortenedUrl = await checkUnique(generateRandomString(6));

    // Save the URL and its shortened version to the database
    const newUrl = new urls({ url: url, shortenedUrl: shortenedUrl });
    await newUrl.save();

    // Send the response with the original and shortened URLs
    return res.json({ original_url: url, short_url: shortenedUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/api/shorturl/:surl", (req, res) => {
  const shortUrl = req.params.surl;
  urls.find({
    shortenedUrl: shortUrl
  }).then((foundUrls) => { // Change variable name to foundUrls
    if (foundUrls.length === 0) {
      return res.status(404).json({ error: 'Shortened URL not found' });
    }
    return res.redirect(foundUrls[0]._doc.url); // Change variable name to foundUrls
  }).catch((err) => {
    return res.status(500).json({error: err})
  })
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
