if(!(window.location.href.startsWith("https://steamcommunity.com/id/") && window.location.href.startsWith("/inventory/"))){alert("This script won't work if you aren't on the Steam inventory page.");}
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
for(var i=0;i<cards.length;i++) {
    if(cards[i].style.display === "none"){continue;}
    if(cards[i].classList.contains("disabled")){continue;}
    //cards[i].click();
    console.log(cards[i]);
}