# FridgePolice

FridgePolice is a small, beginner-friendly roommate food tracker built with React, Vite, JavaScript, and CSS. It keeps shared food inventory, portion requests, approvals, and reservation expiry in the browser using `localStorage`; no account or server is needed.

## Run it locally

1. Install [Node.js](https://nodejs.org/) (Node 18 or newer).
2. Open a terminal in the project folder.
3. Install the dependencies and start Vite:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite (normally `http://localhost:5173`).

To create and preview a production build:

```bash
npm run build
npm run preview
```

Run the business-logic scenario tests with:

```bash
npm test
```

## Try the sample scenarios

The first launch includes Friday pizza at exactly 25% available, with Alex and Sam each requesting 25%. Approve either request: it reserves the full remaining amount immediately. Trying to approve the other request shows an error and cannot make the quantity negative. The sample also includes two separate Cheddar items owned by different roommates to demonstrate independent same-name foods.

Use the inventory controls to correct an item's actual remaining percentage or mark it spoiled. Request portions, approve/reject them in the queue, and mark an approval consumed. The approval-expiry control accepts a configurable number of hours; for a quick demo set it to `0.5`, approve a request, and wait for expiration. Expiration is checked on app load and once per minute while the app is open. Browser storage persists changes on that device.

## GitHub: feature branch and Pull Request

Create an empty GitHub repository first. **Use a dedicated project directory whose Git root is that directory.** This project may be nested inside an existing repository on your computer; do not run `git init` or `git add .` from a folder that would include unrelated files. Confirm the repository root with `git rev-parse --show-toplevel`.

One safe approach is to clone the new empty GitHub repository into a clean directory, copy the FridgePolice project files (including hidden files such as `.gitignore`) into that clone, then run the following there. Replace the URL with your repository's URL:

```bash
git add .
git commit -m "Build FridgePolice roommate food tracker"
git push -u origin HEAD
```

Create and publish a feature branch for your changes (after the initial push):

```bash
git switch -c feature/fridgepolice
git add .
git commit -m "Add FridgePolice inventory and portion requests"
git push -u origin feature/fridgepolice
```

Open the repository on GitHub. Use the **Compare & pull request** prompt (or **Pull requests → New pull request**), select `feature/fridgepolice` as the compare branch and `main` as the base branch, add a title and summary, then select **Create pull request**.

If you are intentionally creating a repository directly from these files rather than cloning an empty one, initialize Git only after confirming the directory is a dedicated project root. Add the remote only if one is not already configured:

```bash
git init
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/FridgePolice.git
```

## 3–5 minute video demonstration

Suggested screen-recording walkthrough (about four minutes):

1. **0:00–0:30 — Intro:** Say what FridgePolice does and point out that it runs locally with no sign-in.
2. **0:30–1:15 — Inventory and duplicate names:** Show the two Cheddar entries and their different owners/quantities. Add a food item and point out its available percentage.
3. **1:15–2:10 — Prevent double allocation:** Show the two 25% pizza requests. Approve Alex's request, then attempt Sam's approval and show the clear not-enough-food message and the zero inventory.
4. **2:10–2:50 — Consume and expire:** Mark an approved portion consumed. Set expiry to a short duration (for example 0.5 hours), approve another request, and explain that unused reservations expire and return to available inventory. (For a quicker recording, temporarily use the browser console only if comfortable, or demonstrate the one-hour behavior in the automated tests.)
5. **2:50–3:35 — Correct and spoil:** Correct a food's actual quantity, mention that older reservations are kept first if the new amount cannot cover all reservations, then mark another item spoiled.
6. **3:35–4:00 — Wrap up:** Show the request status filters and mention `npm test` and the GitHub Pull Request workflow.

Use any screen recorder available on your computer. Save the finished video, upload it to Google Drive, right-click the file and choose **Share**, set general access to **Anyone with the link** (or the intended audience), select **Viewer**, and copy the link. Verify the link in a private/incognito window before sharing it. Avoid showing personal notifications, private browser tabs, or credentials in the recording.
