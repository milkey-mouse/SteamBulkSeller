if(!(window.location.href.startsWith("https://steamcommunity.com/id/") && window.location.href.endsWith("/inventory/"))){alert("This script won't work if you aren't on the Steam inventory page.");}
if(g_rgWalletInfo['wallet_currency'] === 0) {alert("You can't sell trading cards, automatically or manually, until money has been in your Steam wallet.");}

var wasFiltered = false;
var filtersEnabled = false;

function enableFilters(){
    //enable filters for sellable items
    if(filtersEnabled){return;}
    //ShowTagFilters();
    var checkboxes = document.getElementsByTagName("input");
    for(var i=0;i<checkboxes.length;i++) {
        if(checkboxes[i].name.endsWith("misc_marketable")) {
            wasFiltered = checkboxes[i].checked;
            if(wasFiltered === false) {
                checkboxes[i].click();
                break;
            }
        }
    }
    filtersEnabled = true;
}

function disableFilters(){
    //disable filters if they weren't checked when we started
    if(!filtersEnabled){return;}
    var checkboxes = document.getElementsByTagName("input");
    for(var i=0;i<checkboxes.length;i++) {
        if(checkboxes[i].name.endsWith("misc_marketable")) {
            if(checkboxes[i].checked !== wasFiltered){
                checkboxes[i].click();
                break;
            }
        }
    }
    filtersEnabled = false;
}

var profit_total_nofee = 0;
var profit_total = 0;
var cardsJustSold = 0;
var errors = false;
var card_idx = 0;

function dateStringToTicks(dstring){
    //takes a Steam date string and converts to ms since Unix epoch
    var parts = dstring.split(" ");
    var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(parts[0]);
    var year = parseInt(parts[2]);
    var day = parseInt(parts[1]);
    var hour = parseInt(parts[3].split(":")[0]);
    var unixTime = Date.UTC(year, month, day, hour);
    if(parts[3].split(":")[1] !== "")
    {
        unixTime += 1000*60*parseInt(parts[3].split(":")[1]);
    }
    //correct for specified timezone
    if(parts.length > 4){
        if(parts[4][0] === "+"){
            unixTime += 1000*60*60*parseInt(parts[4].substring(1));
        } else if(parts[4][0] === "-"){
            unixTime -= 1000*60*60*parseInt(parts[4].substring(1));
        }
    }
    return unixTime;
}

//keep the original versions of the patched functions to pass to at the end
var real_OnPriceHistorySuccess = SellItemDialog.OnPriceHistorySuccess;
var real_ReloadInventory = UserYou.ReloadInventory;
var real_OnSuccess = SellItemDialog.OnSuccess;
var real_OnFailure = SellItemDialog.OnFailure;
var real_BuildHover = BuildHover;

function patched_BuildHover(prefix,item,owner){
    try {
        real_BuildHover(prefix,item,owner);
    } catch(TypeError) { //ended with an error
        finishSelling();
    }
}

function patched_OnSuccess(transport){
    if(transport.responseJSON)
    {
        if(transport.responseJSON.requires_confirmation){
            if(transport.responseJSON.needs_mobile_confirmation){
                mobile_confirm = true;
            }
            else {
                email_confirm = true;
            }
        }
        transport.responseJSON.requires_confirmation = false;
        transport.responseJSON.needs_email_confirmation = false;
        transport.responseJSON.needs_mobile_confirmation = false;
    }
    //use call() to spoof 'this' from window to SellItemDialog
    real_OnSuccess.call(SellItemDialog, transport);
    UserYou.ReloadInventory = real_ReloadInventory;
    SellItemDialog.Dismiss();
    cardsJustSold++;
    setTimeout(sellNextCard, 500);
}

function patched_OnFailure(transport){
    errors = true;
    var cardName = "???";
    try{
        var elItem = document.getElementsByClassName("itemHolder")[card_idx].children[0];
        cardName = elItem.rgItem.name + " (" + elItem.rgItem.type.replace(" Trading Card", "") + ")";
    } catch(TypeError) {}
    if(transport.responseJSON && transport.responseJSON.message){
        console.error("An error occurred while selling " + cardName + ":\n" + transport.responseJSON.message);
    } else {
        console.error("An unidentified error occurred while selling " + cardName + ".");
    }
    profit_total -= SellItemDialog.GetPriceAsInt();
    profit_total_nofee -= SellItemDialog.GetBuyerPriceAsInt();
    real_OnFailure.call(SellItemDialog, transport);
    SellItemDialog.Dismiss();
    setTimeout(sellNextCard, 800);
}

function patched_OnPriceHistorySuccess(transport){
    //automatically figures out the median price of the past 10 days' sales
    var cardsPerPrice = []; //full of [price, amount]
    var totalCardsSold = 0;
    for(var i=0;i<transport.responseJSON.prices.length;i++){
        var dataPoint = transport.responseJSON.prices[i];
        //ignore data older than 10 days
        if(Date.now() - dateStringToTicks(dataPoint[0]) > 1000*60*60*24*10){continue;}
        var medianPrice = dataPoint[1];
        var cardsSold = parseInt(dataPoint[2]);
        outer:
        for(var j=0;j<cardsPerPrice.length;j++){
            if(cardsPerPrice[j][0] === medianPrice){
                cardsPerPrice[j][1] += cardsSold;
                break outer;
            }
        }
        if(j === cardsPerPrice.length){
            cardsPerPrice.push([medianPrice, cardsSold]);
        }
        totalCardsSold += cardsSold;
    }
    //the finding-the-median part
    cardsPerPrice.sort();
    var cardsToCount = totalCardsSold / 2;
    var priceIdx = -1;
    while(cardsToCount > 0){
        cardsToCount -= cardsPerPrice[++priceIdx][1];
    }
    var totalMedianPrice = Math.round(cardsPerPrice[priceIdx][0] * 100);
    profit_total_nofee += totalMedianPrice;
    //run the original function
    real_OnPriceHistorySuccess(transport);
    //agree to TOS and write the price to the input box
    document.getElementById("market_sell_dialog_accept_ssa").checked = true;
    var totalPriceString = v_currencyformat(totalMedianPrice, GetCurrencyCode(g_rgWalletInfo['wallet_currency']));
    document.getElementById("market_sell_buyercurrency_input").value = totalPriceString;
    //recompute Steam fees
    SellItemDialog.OnBuyerPriceInputKeyUp(null); //tell it we changed the price
    profit_total += SellItemDialog.GetPriceAsInt();
    //sell the card
    var mockEvent = {stop:function(){}};
    SellItemDialog.OnAccept(mockEvent);
    SellItemDialog.OnConfirmationAccept(mockEvent);
}

var email_confirm = false;
var mobile_confirm = false;

function sellNextCard(){
    var cards = document.getElementsByClassName("itemHolder");
    while(cards[card_idx].style.display === "none" && card_idx<cards.length){card_idx++;}
    if(card_idx>cards.length){return;}
    if(card_idx == cards.length){
        finishSelling();
        return;
    }
    var elItem = cards[card_idx].children[0];
    g_ActiveInventory.SelectItem(null, elItem, elItem.rgItem, false);
    
    SellCurrentSelection();
    console.log("Selling " + elItem.rgItem.name + " (" + elItem.rgItem.type.replace(" Trading Card", "") + ").");
    card_idx++;
}

function showCardSellStats(){
    var confirmation_text = "";
    if(mobile_confirm){
        confirmation_text = "\n\nUse your Steam Authenticator app to allow the cards to be listed. If there is no 'Confirm' option, try updating the app.";
    }
    else if(email_confirm){
        confirmation_text = "\n\nSteam has sent you confirmation emails. Open them to list the cards.";
    }
    if(errors){
        confirmation_text += "\n\nThere were some errors while selling cards. Check the console (F12) to see them.";
    }
    alert("Finished selling cards." +
    "\nCards successfully sold: " + cardsJustSold + 
    "\nTotal profit: " + v_currencyformat(profit_total_nofee, GetCurrencyCode(g_rgWalletInfo['wallet_currency'])) +
    "\nTotal profit after Steam fees (est.): " + v_currencyformat(profit_total, GetCurrencyCode(g_rgWalletInfo['wallet_currency'])) +
    confirmation_text);
}

function runSellCycle(){
    enableFilters();
    //monkey-patch the XMLHTTPRequest result for the price data
    SellItemDialog.OnPriceHistorySuccess = patched_OnPriceHistorySuccess;
    //disable ReloadInventory so our card indexes stay valid
    UserYou.ReloadInventory = function(appid,contextid){};
    //patch OnSuccess to not squawk about email or app confirmation
    SellItemDialog.OnSuccess = patched_OnSuccess;
    //patch OnFailure to emit to console and mention it in the stats
    SellItemDialog.OnFailure = patched_OnFailure;
    //patch BuildHover to end the cycle when item is null instead of erroring
    BuildHover = patched_BuildHover;
    //start the cycle
    sellNextCard();
}

function finishSelling(){
    //we're done
    disableFilters();
    //unpatch everything
    SellItemDialog.OnPriceHistorySuccess = real_OnPriceHistorySuccess;
    UserYou.ReloadInventory = real_ReloadInventory;
    SellItemDialog.OnSuccess = real_OnSuccess;
    SellItemDialog.OnFailure = real_OnFailure;
    BuildHover = real_BuildHover;
    showCardSellStats();
}

runSellCycle();