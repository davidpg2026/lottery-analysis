# David's Lottery Analysis

A self-updating statistics site for Illinois lottery games (Powerball, Mega Millions,
Lotto, Lucky Day Lotto, Pick 3, Pick 4). All analysis runs in the browser.

- **Powerball & Mega Millions** load live from the official national results feed (full history).
- **Illinois-only games** are stored in the page and refreshed daily by a GitHub Action.

Everything here is descriptive statistics for entertainment. Lottery draws are independent
random events — nothing on the site can predict results or improve anyone's odds.

---

## Publish it (one-time setup)

You'll do this once; after that it updates itself every day with no further action.

### 1. Create the repository
1. Sign in to GitHub, then go to **https://github.com/new**.
2. **Repository name:** `lottery-analysis`
3. Set it to **Public** (required for free GitHub Pages hosting).
4. Leave everything else as-is and click **Create repository**.

### 2. Upload these files
On the new repo page, click **uploading an existing file** (or **Add file → Upload files**),
then drag in all of these, keeping the folder structure:

```
index.html
update.js
README.md
.github/workflows/update.yml
```

Tip: the easiest way to keep the `.github/workflows/` folder is to drag the whole
project folder in at once. Then click **Commit changes**.

### 3. Turn on GitHub Pages (the public website)
1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Click **Save**.
4. Wait ~1 minute. Your site will be live at:

   **https://davidpg2026.github.io/lottery-analysis/**

   Open that link from any device — phone, tablet, any computer.

### 4. Allow the daily updater to save results
1. Go to **Settings → Actions → General**.
2. Scroll to **Workflow permissions**, choose **Read and write permissions**, and **Save**.

### 5. Run it once to confirm
1. Go to the **Actions** tab.
2. Click **Update lottery data** on the left, then **Run workflow → Run workflow**.
3. After a minute it should show a green check and (if there were new draws) commit them.
   Refresh your site to see the latest numbers.

That's it. From now on it runs automatically each morning — your computer can be off.

---

## Add another lottery later
Open `index.html`, find the `GAMES` config block near the top, and add an entry
following the existing pattern (name, type, number range, bonus ball, data source).
Ball games and digit (Pick-style) games are both supported. For an Illinois game that
should auto-update, also add it to the `GAMES` list in `update.js`.
