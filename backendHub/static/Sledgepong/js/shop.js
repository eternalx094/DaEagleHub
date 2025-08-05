// Get the coin count from local storage
const coinCount = localStorage.getItem("coinsCollected") || 0;
document.getElementById('coinCount').innerText = coinCount;
const boughtSets = JSON.parse(localStorage.getItem("boughtSets")) || ["basicset"];
refreshItem();
// Back button functionality
document.getElementById('backButton').addEventListener('click', function() {
    window.location.href = 'mainmenu.html'; // Adjust the URL as needed
});
document.getElementById('starset').addEventListener('click', function() {
    clickEvent("Star Set", "starset", 10, "images/stars.png");
});
document.getElementById('lightningset').addEventListener('click', function() {
    clickEvent("Lightning Set", "lightningset", 10, "images/lightning.webp");
});
document.getElementById('flameset').addEventListener('click', function() {
    clickEvent("Flame Set", "flameset", 10, "images/flames.webp");
});
document.getElementById('waterset').addEventListener('click', function() {
    clickEvent("Water Set", "waterset", 10, "images/water.webp");
});
document.getElementById('natureset').addEventListener('click', function() {
    clickEvent("Nature Set", "natureset", 10, "images/nature.webp");
});
document.getElementById('galaxyset').addEventListener('click', function() {
    clickEvent("Galaxy Set", "galaxyset", 10, "images/galaxy.webp");
});
document.getElementById('metalset').addEventListener('click', function() {
    clickEvent("Metal Set", "metalset", 10, "images/metal.png");
});
document.getElementById('cloudset').addEventListener('click', function() {
    clickEvent("Cloud Set", "cloudset", 10, "images/cloud.jpg");
});
document.getElementById('basicset').addEventListener('click', function() {
    clickEvent("Classic Set", "basicset", 0, "images/classic.png");
});
function refreshItem() {
    var item = document.getElementsByClassName('item');
    var equippedItem = localStorage.getItem("selectedItemId") || "basicset";

    for (var i = 0; i < item.length; i++) {
        if (boughtSets.includes(item[i].id)) {
            boughtEffect(item[i]);
            if (equippedItem == item[i].id) {
                item[i].style.backgroundColor = "blue";
                item[i].getElementsByClassName('item-price')[0].innerText = "Equipped";
            }
            
    }
}
}
function buyItem(itemName, id, price, texture) {
    const currentCoins = parseInt(localStorage.getItem("coinsCollected")) || 0;
    const newCoins = currentCoins - price;
    if (newCoins < 0) {
        alert("Insufficient coins. You need " + Math.abs(newCoins) + " more coins to buy this item.");
        return;
    }

    if (confirm("Are you sure you want to buy the " + itemName + "?")) {
        // User clicked "OK/Yes"
        localStorage.setItem("coinsCollected", newCoins);
        localStorage.setItem("selectedBallTexture", texture);
        document.getElementById('coinCount').innerText = newCoins;
        // Add your purchase logic here
        alert("Purchase confirmed!");
        boughtSets.push(id);
        localStorage.setItem("boughtSets", JSON.stringify(boughtSets));
        refreshItem()
    } else {
        // User clicked "Cancel/No"
        alert("Purchase cancelled!");
        
    }
}
function boughtEffect (item) {
    item.style.backgroundColor = "green";
    item.getElementsByClassName('item-price')[0].innerText = "Bought";
    }
function clickEvent(itemName, id, price, texture) {
    var item = document.getElementById(id);
    if (boughtSets.includes(id)) {
        // Item already bought: do something, e.g., alert or equip
        equipItem(itemName, id, texture);
    } else {
        // Item not bought yet: you might initiate a purchase or show details
        buyItem(itemName, id, price, texture);
    }
}

function equipItem(itemName, id, texture){
    alert("You have equipped the " + itemName + "!");
    localStorage.setItem("selectedBallTexture", texture);
    localStorage.setItem("selectedItemId", id);
    refreshItem();
    var item = document.getElementById(id);
    item.style.backgroundColor = "blue";
    item.getElementsByClassName('item-price')[0].innerText = "Equipped";
}
const backgroundMusic = new Audio('music/Xtrullor - Supernova.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.05; // Adjust volume as needed

    // Start music on first click anywhere on the page
    document.body.addEventListener('click', function startMusic() {
        backgroundMusic.play().catch(err => {
            console.log("Music failed to play: ", err);
        });
        document.body.removeEventListener('click', startMusic);
    });
//localStorage.setItem("coinsCollected", 1000000); 
//Uncomment line  to add coins, update Your game, then comment to perform the admin command. This one adds coins to your balance.
//localStorage.setItem("boughtSets", JSON.stringify([]));
