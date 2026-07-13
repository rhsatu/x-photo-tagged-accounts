# X Photo Viewer - Show Tagged Accounts

A Tampermonkey userscript for x.com (Twitter). When someone tags another account in a photo, X shows that tag in the timeline — but not when you click into the photo for the full-screen view. This script restores it: a small label with the tagged account's name appears on the photo in the full-screen viewer, linking to their profile.

Works on any account's photos, not just one specific user.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) if you don't have it yet.
2. Click here: [Install script](https://raw.githubusercontent.com/rhsatu/x-photo-tagged-accounts/master/x-photo-tagged-accounts.user.js)
3. Tampermonkey will open an install prompt — click **Install**.
4. Reload x.com. Open any photo that has a tagged account and the label will appear at the bottom-left of the photo.

## How it works

X's own website already loads the tagged-account data in the background for every photo — it just doesn't display it in the full-screen viewer. This script reads that data as it arrives and adds the missing label. It never sends any extra requests to X.
