// Back button functionality
document.addEventListener('DOMContentLoaded', function() {
    const backButton = document.getElementById('backButton');

    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Add click event listeners to non-collected items for buying
    const nonCollectedItems = document.querySelectorAll('.non_collected_items');
    nonCollectedItems.forEach(item => {
        item.addEventListener('click', function() {
            // Extract texture ID from the parent item container
            const textureId = this.getAttribute('data-texture-id');
            const textureName = this.querySelector('div').textContent.trim();

            // Show confirmation popup
            if (confirm(`Are you sure you want to buy ${textureName} for 10 coins?`)) {
                buyTexture(textureId, textureName, this);
            }
        });
    });

    // Add click event listeners to collected items for equipping
    const collectedItems = document.querySelectorAll('.collected_items');
    collectedItems.forEach(item => {
        item.addEventListener('click', function() {
            const textureId = this.getAttribute('data-texture-id');
            const textureName = this.querySelector('div').textContent.trim();
            equipTexture(textureId, textureName, this);
        });
    });
});

// Function to handle texture purchase
async function buyTexture(textureId, textureName, itemElement) {
    try {
        // Get CSRF token
        const csrfToken = getCookie('csrftoken');

        // Make request to Django buy endpoint
        const response = await fetch(`buy/${textureId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            }
        });

        const responseText = await response.text();

        if (response.ok && responseText === 'Transaction Successful') {
            alert(`${textureName} purchased successfully!`);

            // Update coin count (subtract 10)
            const coinCountElement = document.getElementById('coinCount');
            const currentCoins = parseInt(coinCountElement.textContent);
            coinCountElement.textContent = currentCoins - 10;

            // Transform the item from non-collected to collected
            itemElement.className = 'collected_items';
            itemElement.querySelector('.item-price').textContent = 'Owned';

            // Add click handler for equipping
            itemElement.addEventListener('click', function() {
                const textureId = this.getAttribute('data-texture-id');
                const textureName = this.querySelector('div').textContent.trim();
                equipTexture(textureId, textureName, this);
            });

        } else {
            // Handle different error responses
            if (responseText === 'Not Enough Money') {
                alert('You don\'t have enough coins to buy this texture!');
            } else if (responseText === 'Wrong Texture ID') {
                alert('Invalid texture selected.');
            } else {
                alert('Purchase failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Error during purchase:', error);
        alert('An error occurred during purchase. Please try again.');
    }
}

// Function to handle texture equipping (for collected items)
async function equipTexture(textureId, textureName, itemElement) {
    try {
        // Check if this item is already equipped
        if (itemElement.className === 'current_item') {
            alert(`${textureName} is already equipped!`);
            return;
        }

        const response = await fetch(`equip/${textureId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            }
        });

        const responseText = await response.text();

        if (response.ok && responseText === 'Texture Equipped') {
            alert(`${textureName} equipped!`);

            // Find the currently equipped item and change it to collected
            const currentItem = document.querySelector('.current_item');
            if (currentItem) {
                currentItem.className = 'collected_items';
                currentItem.querySelector('.item-price').textContent = 'Owned';

                // Re-add click handler to the previously equipped item
                currentItem.addEventListener('click', function() {
                    const textureId = this.getAttribute('data-texture-id');
                    const textureName = this.querySelector('div').textContent.trim();
                    equipTexture(textureId, textureName, this);
                });
            }

            // Make clicked item the current equipped item
            itemElement.className = 'current_item';
            itemElement.querySelector('.item-price').textContent = 'Equipped';

            // Remove click handler from the newly equipped item since it's now current
            itemElement.replaceWith(itemElement.cloneNode(true));

        } else {
            if (responseText === 'Texture Not Owned') {
                alert('You don\'t own this texture!');
            } else if (responseText === 'Wrong Texture ID') {
                alert('Invalid texture selected.');
            } else {
                alert('Failed to equip texture.');
            }
        }
    } catch (error) {
        console.error('Error during equipping:', error);
        alert('An error occurred while equipping texture.');
    }
}

// Helper function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}