# KittyReplace

A Chrome extension that replaces all images on any webpage with random cat images.

## Setup

1. Get your free API key from [TheCatAPI](https://developers.thecatapi.com/)
2. Open `config.js` and replace the `API_KEY` value with your own key
3. Load the extension in Chrome via `chrome://extensions/` → Developer mode → Load unpacked

## API Key

Your API key goes in `config.js`:

```js
const API_KEY = 'your_api_key_here';
```

> Never commit `config.js` or `.env` to a public repo. They are gitignored.

## .env

The `.env` file stores your key for reference:

```
THECATAPI_KEY=your_api_key_here
```

## Git Ignore

The following files are excluded from version control:

- `.env`
- `config.js`
