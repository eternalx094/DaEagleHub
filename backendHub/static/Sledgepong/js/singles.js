const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game elements dimensions
const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 15;
const coinSize = 30; // Size of the coin

// Paddle position
let paddleY = canvas.height / 2 - paddleHeight / 2;
const paddleSpeed = 40;
// Ball position and speed
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;

// Coin position
let coinX = Math.floor(Math.random() * (canvas.width - coinSize));
let coinY = Math.floor(Math.random() * (canvas.height - coinSize));

// Load the coin image
const coinImage = new Image();
coinImage.src = 'images/coinimage.png'; // Path to your coin image
// Load the paddle and ball images
const paddleImage = new Image();
paddleImage.src = localStorage.getItem("selectedBallTexture") || "images/classic.png"; // Path to your paddle texture
const ballImage = new Image();
ballImage.src = localStorage.getItem("selectedBallTexture") || "images/classic.png"; // Path to your ball texture

// Retrieve ball speed from local storage, default to 4 if not set
let ballSpeedX = Number(localStorage.getItem("ballSpeed")) || 4;
let ballSpeedY = Number(localStorage.getItem("ballSpeed")) || 4;
let milim = [
    ['Vegetables', 'ירקות'],
    ['T-Shirt', 'חולצה'],
    ['Spicy', 'חריף'], 
    ['Cup', 'כוס'], 
    ['Shop', 'חנות'],
    ['Food', 'אוכל'],
    ['Brain', 'מוח'],
    ['Orange', 'תפוז'],
    ['Pants', 'מכנסיים'],
    ['Skip', 'לדלג'],
    ['Cold', 'קר'],
    ['Box', 'קופסה'],
    ['Juice', 'מיץ'],
    ['Bird', 'ציפור'],
    ['Gift', 'מתנה'],
    ['Healthy', 'בריא'],
    ['Paint', 'צבע'],
    ['Pain', 'כאב'],
    ['Hat', 'כובע'],
    ['Policeman', 'שׁוֹטר'],
    ['Teacher', 'מורה'],
    ['Fireman', 'כבאי'],
    ['Computer', 'מחשב'],
    ['Candy', 'ממתק'],
    ['Country', 'מדינה'],
    ['Mouse', 'עכבר'],
    ['Mouth', 'פה'],
    ['Smile', 'חיוך'],
    ['Little', 'קטן'],
    ['Rat', 'עכברוש'],
    ['Eyes', 'עיניים'],
    ['Brother', 'אח'],
    ['Fruit', 'פירות'],
    ['Change', 'החלפה'],
    ['Moon', 'ירח'],
    ['Sun', 'שמש'],
    ['Electricity', 'חשמל'],
    ['Watch', 'לצפות'],
    ['Villain', 'נבל'],
    ['Shelf', 'מדף'],
];
let current_milim = milim[Math.floor(Math.random() * milim.length)];
let letter_x = Math.floor(Math.random() * canvas.width);
let letter_y = Math.floor(Math.random() * canvas.height);
let letter_count = 0;
let letter_list = "";
// Game state
let isPaused = false;
let isAsked = false;

// Initialize coin counter
let coinsCollected = Number(localStorage.getItem("coinsCollected")) || 0;

// Display coin count
const coinCountDisplay = document.createElement('div');
coinCountDisplay.style.color = 'white';
coinCountDisplay.style.fontSize = '20px';
coinCountDisplay.style.position = 'absolute';
coinCountDisplay.style.top = '100px'; // Adjust as needed
coinCountDisplay.style.left = '10px'; // Adjust as needed
coinCountDisplay.innerText = `Coins Collected: ${coinsCollected}`;
document.body.appendChild(coinCountDisplay);

document.getElementById('backButton').addEventListener('click', function() {
    window.location.href = 'playpage.html';
});

// Game loop
function gameLoop() {
    update_game();
    if (isAsked) {
        let answer = prompt("תרגם/י את המילה: " + current_milim[0]);
        if (answer === current_milim[1]) {
            alert("נכון");
            current_milim = milim[Math.floor(Math.random() * milim.length)];
            letter_count = 0;
            letter_x = Math.floor(Math.random() * canvas.width);
            letter_y = Math.floor(Math.random() * canvas.height);
            // Increment coin counter and update local storage
            coinsCollected+=5;
            localStorage.setItem("coinsCollected", coinsCollected);
            
            // Update the displayed coin count
            coinCountDisplay.innerText = `Coins Collected: ${coinsCollected}`;
        } else {
            alert("לא נכון, התשובה הנכונה היא: " + current_milim[1]);
        }
        isAsked = false;
    }

    if (!isPaused) {
        moveBall();
    }
    drawEverything();
    requestAnimationFrame(gameLoop);
}

// Move the ball
function update_game() {
    if (ballX >= letter_x - 30 && ballX <= letter_x + 30 && ballY >= letter_y - 30 && ballY <= letter_y + 30) {
        letter_count++;
        if (letter_count >= current_milim[0].length) {
            letter_count = 0;
            isAsked = true;
        }
        letter_x = Math.floor(Math.random() * canvas.width);
        letter_y = Math.floor(Math.random() * canvas.height);
    }

    // Check for coin collection
    if (ballX >= coinX - 30 && ballX <= coinX + 30 && ballY >= coinY - 30 && ballY <= coinY + 30) {
        // Coin collected, reset coin position
        coinX = Math.floor(Math.random() * (canvas.width - coinSize));
        coinY = Math.floor(Math.random() * (canvas.height - coinSize));
        
        // Increment coin counter and update local storage
        coinsCollected++;
        localStorage.setItem("coinsCollected", coinsCollected);
        
        // Update the displayed coin count
        coinCountDisplay.innerText = `Coins Collected: ${coinsCollected}`;
    }
}

function moveBall() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Ball bounces off the top and bottom walls
    if (ballY <= 0 || ballY + ballSize >= canvas.height) {
        ballSpeedY = -ballSpeedY;
    }

    // Ball bounces off the paddle
    if (ballX <= paddleWidth && ballY >= paddleY && ballY <= paddleY + paddleHeight) {
        ballSpeedX = -ballSpeedX; // Reverse the ball direction
    }

    // Ball resets if it goes past the left edge (missed paddle)
    if (ballX < 0) {
        resetBall(); // Optional: Update score here
    }

    // Optional: Remove or modify this for clearer behavior
    if (ballX + ballSize >= canvas.width) {
        ballSpeedX = -ballSpeedX; // Currently, this may not be needed
    }
}

// Draw everything on the canvas
function drawEverything() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(paddleImage, 0, paddleY, paddleWidth, paddleHeight);

    // Draw the ball using the texture
    ctx.drawImage(ballImage, ballX, ballY, ballSize, ballSize);
    // Draw the letter
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(current_milim[0][letter_count], letter_x, letter_y);
    
    // Draw the coin
    drawCoin();

    // If the game is paused, draw the pause overlay
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
    }
}

// Function to draw the coin using an image
function drawCoin() {
    ctx.drawImage(coinImage, coinX, coinY, coinSize, coinSize); // Draw the coin image
}

// Paddle movement control
window.addEventListener('wheel', function(event) {
    if (!isPaused) { // Only allow paddle movement if not paused
        if (event.deltaY < 0 && paddleY > 0) {
            // Scroll up moves the paddle up
            paddleY -= paddleSpeed;
        } else if (event.deltaY > 0 && paddleY < canvas.height - paddleHeight) {
            // Scroll down moves the paddle down
            paddleY += paddleSpeed;
        }
    }
});

// Event listener for the 'p' key to toggle pause
window.addEventListener('keydown', function(event) {
    if (event.key === 'p' || event.key === 'P' || event.key === 'פ') {
        isPaused = !isPaused; // Toggle pause state
    }
});

// Reset the ball to the center after missing the paddle
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = -ballSpeedX; // Change direction for fairness
    // Increment coin counter and update local storage
    if (coinsCollected > 0) {

        coinsCollected--;
        localStorage.setItem("coinsCollected", coinsCollected);
        
        // Update the displayed coin count
        coinCountDisplay.innerText = `Coins Collected: ${coinsCollected}`;
        
}
}
const backgroundMusic = new Audio('music/The Master.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5; // Adjust volume as needed

    // Start music on first click anywhere on the page
    document.body.addEventListener('click', function startMusic() {
        backgroundMusic.play().catch(err => {
            console.log("Music failed to play: ", err);
        });
        document.body.removeEventListener('click', startMusic);
    });
// Start the game loop
gameLoop();