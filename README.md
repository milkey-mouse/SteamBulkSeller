# Steam Bulk Seller

If you're like me, you don't care much about custom emoji or whatever collecting Steam Trading Cards get you. Instead, sell each of the cards for ~10¢ each. If you've got an inventory with hundreds of cards, this can make you enough money in your Steam wallet to buy a few cheap games.

This small JavaScript snippet automatically sells all of the Steam trading cards in your inventory. It sells them for the median price of each card for the past week's sales.

This script works well with [IdleMaster](http://steamidlemaster.com/), a program you can leave running for ~24 hours and get all the possible Steam trading cards from your games.

## How to use

- Log into Steam on [the Steam website](https://steamcommunity.com/login):

![Steam website login](https://raw.githubusercontent.com/milkey-mouse/SteamBulkSeller/master/steam_signin.jpg)

- Go to your inventory:

![Inventory on Steam dropdown](https://raw.githubusercontent.com/milkey-mouse/SteamBulkSeller/master/inventory_dropdown.jpg)

From here you can either create a bookmarklet or manually input the file contents.

### Bookmarklet (easiest option)
- Drag the link on [this page](https://meme.institute/steamsell/) to the bookmarks bar.
- Go back to the Steam page and click on the new bookmark.

### Manual input
- On the Steam inventory page, press `F12` to open the dev console and switch to the tab marked "Console". This works on all major browsers, but the screenshot is of Chrome:

![Open the Chrome dev console](https://raw.githubusercontent.com/milkey-mouse/SteamBulkSeller/master/chrome_dev_console.jpg)

- Paste the contents of [this file](https://github.com/milkey-mouse/SteamBulkSeller/blob/master/steam-bulk-sell.js) after the caret in the console and press enter.
- Wait while it sells all the cards. It should only take 60 seconds or so.
