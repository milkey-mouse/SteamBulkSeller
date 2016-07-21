if(!(window.location.href.startsWith("https://steamcommunity.com/id/") && window.location.href.endsWith("/inventory/"))){alert("This script won't work if you aren't on the Steam inventory page.");}
if(g_rgWalletInfo['wallet_currency'] === 0) {
    alert("You can't sell trading cards, manually or automatically, until money has been in your Steam wallet.");
}
ShowTagFilters();
var checkboxes = document.getElementsByTagName("input");
for(var i=0;i<checkboxes.length;i++) {
    if(checkboxes[i].name.endsWith("misc_marketable")) {
        console.log(checkboxes[i]);
        if(checkboxes[i].checked === false) {
            checkboxes[i].click();
        }
    }
}
var cards = document.getElementsByClassName("itemHolder");
var card_idx = 0;
//keep a sterile, callback-free version of this function
var real_OnPriceHistorySuccess = SellItemDialog.OnPriceHistorySuccess;
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateStringToTicks(dstring){
    //takes a Steam date string and converts to ms since Unix epoch
    var parts = dstring.split(" ");
    var month = months.indexOf(parts[0]);
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

function sellNextCard(){
    while(cards[card_idx].style.display === "none" && card_idx<cards.length){card_idx++;}
    var elItem = cards[card_idx].children[0];
    g_ActiveInventory.SelectItem(null, elItem, elItem.rgItem, false);
    //monkey-patch the XMLHTTPRequest result for the price data
    SellItemDialog.OnPriceHistorySuccess = function(transport){
        for(var i=transport.responseJSON.prices.length;i>0;i--){
            if(Date.now() - dateStringToTicks(transport.responseJSON.prices[i][0]) > 1000*60*60*24*10){continue;} //ignore data older than 10 days
            console.log(transport.responseJSON.prices[i][0]);
        }
        real_OnPriceHistorySuccess(transport);
        SellItemDialog.OnPriceHistorySuccess = real_OnPriceHistorySuccess;
    } 
    SellCurrentSelection();
}