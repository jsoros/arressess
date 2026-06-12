require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const Parser = require('rss-parser');
const { subDays, isAfter, parseISO } = require('date-fns');

const OPML_FILE = path.join(__dirname, 'feeds.opml');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const OUTPUT_FILE = path.join(__dirname, 'src', '_data', 'articles.json');

async function run() {
  // 1. Read config
  let config = { defaultLookbackDays: 1 };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn("Could not read config.json, using defaults.");
  }

  // Determine lookback days from env var or config
  const lookbackDays = parseInt(process.env.LOOKBACK_DAYS) || config.defaultLookbackDays;
  const cutoffDate = subDays(new Date(), lookbackDays);

  console.log(`Fetching articles published after: ${cutoffDate.toISOString()} (Lookback: ${lookbackDays} days)`);

  // 2. Read OPML
  if (!fs.existsSync(OPML_FILE)) {
    console.error("feeds.opml not found!");
    process.exit(1);
  }

  const opmlContent = fs.readFileSync(OPML_FILE, 'utf-8');
  const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const opmlObj = xmlParser.parse(opmlContent);

  // Extract feed URLs
  const feedUrls = [];

  function extractFeeds(outline) {
    if (Array.isArray(outline)) {
      outline.forEach(extractFeeds);
    } else if (outline && typeof outline === 'object') {
      if (outline['@_xmlUrl']) {
        feedUrls.push({
          title: outline['@_title'] || outline['@_text'],
          url: outline['@_xmlUrl']
        });
      }
      if (outline.outline) {
        extractFeeds(outline.outline);
      }
    }
  }

  if (opmlObj && opmlObj.opml && opmlObj.opml.body && opmlObj.opml.body.outline) {
    extractFeeds(opmlObj.opml.body.outline);
  }

  console.log(`Found ${feedUrls.length} feeds in OPML.`);

  // 3. Fetch RSS feeds
  const rssParser = new Parser({
    customFields: {
      item: [
        ['media:content', 'mediaContent'],
        ['media:thumbnail', 'mediaThumbnail'],
        ['content:encoded', 'contentEncoded']
      ]
    }
  });

  const allArticles = [];

  for (const feed of feedUrls) {
    try {
      console.log(`Fetching: ${feed.title} (${feed.url})`);
      const parsedFeed = await rssParser.parseURL(feed.url);

      for (const item of parsedFeed.items) {
        if (!item.isoDate && !item.pubDate) continue;

        let pubDate;
        try {
          pubDate = item.isoDate ? parseISO(item.isoDate) : new Date(item.pubDate);
        } catch(e) {
          continue; // skip unparseable dates
        }

        if (isAfter(pubDate, cutoffDate)) {
          // Attempt to extract an image
          let imageUrl = null;

          if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) {
             imageUrl = item.mediaContent['$'].url;
          } else if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
             imageUrl = item.mediaThumbnail['$'].url;
          } else if (item.contentEncoded || item.content) {
            // Regex to find first image in HTML content
            const match = (item.contentEncoded || item.content).match(/<img[^>]+src="([^">]+)"/i);
            if (match && match[1]) {
               imageUrl = match[1];
            }
          } else if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
             imageUrl = item.enclosure.url;
          }

          allArticles.push({
            feedTitle: feed.title || parsedFeed.title,
            title: item.title,
            link: item.link,
            pubDate: pubDate.toISOString(),
            snippet: item.contentSnippet ? item.contentSnippet.substring(0, 200) + '...' : '',
            imageUrl: imageUrl
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching ${feed.url}: ${err.message}`);
    }
  }

  // Sort articles newest first
  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  console.log(`Total recent articles found: ${allArticles.length}`);

  // 4. Save to _data
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allArticles, null, 2));
  console.log(`Wrote articles to ${OUTPUT_FILE}`);
}

run();
