const SUPABASE_URL = "https://rtvfxoqrhypuaktlegcr.supabase.co";
const SUPABASE_KEY = "sb_publishable_UgxzqZ4oe8M0w2axk3rgOw_VMJaXt5q";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let coins = 0;
let playerCards = [];
let imageCache = {};
let startX = 0;
let swiped = false;
let defenders = [];
let spawnTimer = 0;
let gameRunning = false;
let yards = 0;
let pressTimer = null;
let fieldScroll = 0;
let packPrice = 0;
let longPressTriggered = false;

let fieldImage = new Image();
fieldImage.src = "images/field.png";

let runnerSprite = new Image();
runnerSprite.src = "images/runner.png";

let defenderSprite = new Image();
defenderSprite.src = "images/defender.png";

const cardBack = new Image();
cardBack.src = "images/card-back.png";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const base = document.getElementById("joystickBase");
const stick = document.getElementById("joystickStick");

const GAME_VERSION = "1.3";

let player = {
  x: 0,
  y: 0,
  radius: 15,
  speed: 4
};

let joystick = {
  active: false,
  dx: 0,
  dy: 0
};

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(s => {
    s.style.display = "none";
  });

  const target = document.getElementById(screen);
  if (target) target.style.display = "block";

  if (screen === "gameScreen") {
    base.style.display = "block";
  } else {
    base.style.display = "none";
  }
}

function resizeCanvas() {
  const maxWidth = window.innerWidth;
  const maxHeight = window.innerHeight - 120;
  canvas.width = maxWidth;
  canvas.height = maxHeight;
}

function updateCoins() {
  animateCoins(coins);
}

function saveGame() {
  localStorage.setItem("gv_coins", coins);
  localStorage.setItem("gv_cards", JSON.stringify(playerCards));
  localStorage.setItem("gv_database", JSON.stringify(cards));

  const user = localStorage.getItem("gv_user");

  if (user) {
    supabaseClient
      .from("players")
      .update({ coins: coins })
      .eq("id", user);
  }
}

function checkGameVersion() {
  const savedVersion = localStorage.getItem("gv_version");

  if (savedVersion !== GAME_VERSION) {
    localStorage.removeItem("gv_database");
    localStorage.setItem("gv_version", GAME_VERSION);
  }
}

function loadGame() {
  const savedCoins = localStorage.getItem("gv_coins");
  const savedCards = localStorage.getItem("gv_cards");
  const savedDatabase = localStorage.getItem("gv_database");

  if (savedCoins) {
    coins = parseInt(savedCoins, 10);
  }

  if (savedCards) {
    playerCards = JSON.parse(savedCards);
  }

  if (savedDatabase) {
    cards = JSON.parse(savedDatabase);
  }

  updateCoins();
}

function preloadImages() {
  cards.forEach(card => {
    const img = new Image();
    img.src = card.image;
    imageCache[card.image] = img;
  });
}

function startGame() {
  showScreen("gameScreen");

  gameRunning = true;
  defenders = [];
  spawnTimer = 0;
  yards = 0;
  fieldScroll = 0;

  player.x = canvas.width / 2;
  player.y = canvas.height - 120;

  joystick.dx = 0;
  joystick.dy = 0;
  stick.style.left = "40px";
  stick.style.top = "40px";

  document.getElementById("yardScore").innerText = "Yards: 0";
}

function gameOver() {
  if (!gameRunning) return;

  gameRunning = false;

  const earnedCoins = Math.floor(yards / 5);
  coins += earnedCoins;

  updateCoins();
  saveGame();

  alert(
    "Tackled!\nYou ran " +
      Math.floor(yards) +
      " yards\nCoins earned: " +
      earnedCoins
  );

  defenders = [];
  showScreen("menuScreen");
}

function spawnDefender() {
  const difficulty = 1 + yards / 300;

  const defender = {
    x: Math.random() * canvas.width,
    y: -40,
    radius: 15,
    speed: 2 + Math.random() * 2 + difficulty,
    tracking: 0.02 + yards / 20000
  };

  defenders.push(defender);
}

function updateGame() {
  if (!gameRunning) return;

  fieldScroll += 3 + yards / 500;
  if (fieldScroll >= fieldImage.height) {
    fieldScroll = 0;
  }

  yards += 0.1;
  document.getElementById("yardScore").innerText =
    "Yards: " + Math.floor(yards);

  spawnTimer++;

  const spawnRate = Math.max(20, 60 - yards / 25);
  if (spawnTimer > spawnRate) {
    spawnDefender();
    spawnTimer = 0;
  }

  player.x += joystick.dx * player.speed;
  player.y += joystick.dy * player.speed;

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  defenders.forEach(d => {
    d.y += d.speed;

    const dx = player.x - d.x;
    const dy = player.y - d.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    d.x += dx * (d.tracking + distance / 50000);
  });

  defenders = defenders.filter(d => d.y < canvas.height + 50);

  defenders.forEach(d => {
    const dx = player.x - d.x;
    const dy = player.y - d.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.radius + d.radius) {
      gameOver();
    }
  });
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(fieldImage, 0, fieldScroll, canvas.width, fieldImage.height);
  ctx.drawImage(fieldImage, 0, fieldScroll - fieldImage.height, canvas.width, fieldImage.height);

  const size = 120;
  ctx.drawImage(
    runnerSprite,
    player.x - size / 2,
    player.y - size / 2,
    size,
    size
  );

  const defenderSize = 160;
  defenders.forEach(d => {
    ctx.drawImage(
      defenderSprite,
      d.x - defenderSize / 2,
      d.y - defenderSize / 2,
      defenderSize,
      defenderSize
    );
  });
}

function gameLoop() {
  updateGame();
  drawGame();
  requestAnimationFrame(gameLoop);
}

function showPackScreen() {
  updateCoins();
  showScreen("packScreen");
}

function spawnPack() {
  if (coins < packPrice) {
    alert("Not enough coins");
    return;
  }

  coins -= packPrice;
  updateCoins();

  swiped = false;
  document.getElementById("packResult").innerHTML = "";
  document.getElementById("packArea").style.display = "block";

  saveGame();
}

function backToMenu() {
  document.getElementById("packResult").innerHTML = "";
  document.getElementById("packArea").style.display = "none";
  showScreen("menuScreen");
}

async function openPack(){

document.getElementById("packArea").style.display = "none"

let user = localStorage.getItem("gv_user")

if(!user){
alert("You must login first")
return
}

const { data: available } = await supabaseClient
.from("cards")
.select("*")

if(!available || available.length === 0){
alert("No cards available")
return
}

const pulledCards = []

for(let i=0;i<3;i++){

let card = available[Math.floor(Math.random()*available.length)]

let serial = card.next_serial

await supabaseClient
.from("cards")
.update({next_serial: serial + 1})
.eq("id", card.id)

await supabaseClient
.from("player_cards")
.insert([{
player_id: user,
card_id: card.id,
serial: serial
}])

let cardInfo = cards.find(c => c.name === card.name)

let finalCard = {
...cardInfo,
serial: serial
}

pulledCards.push(finalCard)
playerCards.push(finalCard)

}

revealCards(pulledCards)
await loadPlayerCards()
saveGame()

}

let coinAnimation = null;

function animateCoins(targetCoins) {
  const coinsElement = document.getElementById("coins");
  const packCoinsElement = document.getElementById("packCoins");

  const startText = coinsElement ? coinsElement.innerText : "0";
  let current = parseInt(startText || "0", 10);
  const step = targetCoins > current ? 1 : -1;

  if (coinAnimation) {
    clearInterval(coinAnimation);
  }

  coinAnimation = setInterval(() => {
    if (current === targetCoins) {
      clearInterval(coinAnimation);
      coinAnimation = null;
      return;
    }

    current += step;

    if (coinsElement) coinsElement.innerText = current;
    if (packCoinsElement) packCoinsElement.innerText = current;
  }, 15);
}

function revealCards(cardsToReveal) {
  const result = document.getElementById("packResult");

  result.innerHTML = `
    <p class="revealText">Touch card to reveal</p>
    <div class="packCards" id="packCards"></div>
  `;

  const container = document.getElementById("packCards");

  cardsToReveal.forEach(card => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "packCard";

    cardDiv.innerHTML = `
      <img src="${cardBack.src}" class="cardImage">
    `;

    const img = cardDiv.querySelector("img");

    cardDiv.addEventListener("touchstart", e => {
      e.preventDefault();
      if (img.dataset.revealed) return;
      img.src = imageCache[card.image].src;
      img.dataset.revealed = "true";
    });

    cardDiv.addEventListener("click", e => {
      e.preventDefault();
      if (img.dataset.revealed) return;
      img.src = imageCache[card.image].src;
      img.dataset.revealed = "true";
    });

    container.appendChild(cardDiv);
  });
}

function openCollection() {
  showCollection();
  showScreen("collectionScreen");
}

async function showCollection(){

let user = localStorage.getItem("gv_user")

const { data } = await supabaseClient
.from("player_cards")
.select("*")
.eq("player_id", user)

const area = document.getElementById("collectionList")
area.innerHTML = ""

if(!data || data.length === 0){
area.innerHTML = "<p>No cards yet</p>"
return
}

data.forEach(card => {

area.innerHTML += `
<div class="collectionCard">
<div class="cardInner">

<div class="cardFront">
<img src="images/cards/${card.card_id}.png">
</div>

<div class="cardBack">
<div class="cardSerial">#${card.serial}</div>
</div>

</div>
</div>
`

})

}

function startPress(e, index) {
  longPressTriggered = false;

  pressTimer = setTimeout(() => {
    longPressTriggered = true;
    inspectCard(playerCards[index]);
  }, 500);
}

function endPress(e, index) {
  clearTimeout(pressTimer);

  if (longPressTriggered) {
    longPressTriggered = false;
    return;
  }

  flipCollectionCard(index);
}

function flipCollectionCard(index) {
  const card = document.getElementById("cardInner" + index);
  if (card) {
    card.classList.toggle("flipped");
  }
}

function cancelPress() {
  clearTimeout(pressTimer);
}

function inspectCard(card) {
  document.getElementById("inspectPopup").style.display = "flex";
  document.getElementById("inspectFront").style.display = "block";
  document.getElementById("inspectBack").style.display = "none";

  document.getElementById("inspectFront").src = card.image;
  document.getElementById("inspectName").innerText = card.name;
  document.getElementById("inspectTeam").innerText = "Team: " + card.team;
  document.getElementById("inspectHeight").innerText = "Height: " + card.height;
  document.getElementById("inspectWeight").innerText = "Weight: " + card.weight;
  document.getElementById("inspectForty").innerText = "Position: " + card.position;
  document.getElementById("inspectSet").innerText = "Set: " + card.set;
}

function flipCard() {
  const front = document.getElementById("inspectFront");
  const back = document.getElementById("inspectBack");

  if (front.style.display !== "none") {
    front.style.display = "none";
    back.style.display = "block";
  } else {
    front.style.display = "block";
    back.style.display = "none";
  }
}

function closeInspect() {
  document.getElementById("inspectPopup").style.display = "none";
}

async function createAccount() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();

  if (!username || !password) {
    alert("Enter username and password");
    return;
  }

  const { error } = await supabaseClient
    .from("players")
    .insert([{
      username: username,
      password_hash: password,
      coins: 0
    }]);

  if (error) {
    console.error(error);
    alert("Username already taken or account creation failed");
    return;
  }

  alert("Account created!");
  showScreen("menuScreen");
}

async function login(){

let username = document.getElementById("usernameInput").value
let password = document.getElementById("passwordInput").value

const { data, error } = await supabaseClient
.from("players")
.select("*")
.eq("username", username)
.eq("password_hash", password)
.single()

console.log("LOGIN RESULT:", data, error)

if(error){
alert("Login error: " + error.message)
return
}

if(!data){
alert("Invalid username or password")
return
}

localStorage.setItem("gv_user", data.id)

coins = data.coins || 0
updateCoins()

await loadPlayerCards()

showScreen("menuScreen")

}

window.onload = function () {
  resizeCanvas();
  checkGameVersion();

  if (typeof cards === "undefined") {
    console.error("cards.js failed to load");
    return;
  }

  preloadImages();
  loadGame();

  const pack = document.getElementById("packImage");

  if (pack) {
    pack.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
    });

    pack.addEventListener("touchmove", e => {
      const currentX = e.touches[0].clientX;
      const distance = currentX - startX;

      if (distance > 120 && !swiped) {
        swiped = true;
        openPack();
      }
    });
  }

  base.addEventListener("touchstart", e => {
    e.preventDefault();
    joystick.active = true;
  });

  base.addEventListener("touchmove", e => {
    e.preventDefault();

    const rect = base.getBoundingClientRect();
    const touch = e.touches[0];

    let x = touch.clientX - rect.left - 60;
    let y = touch.clientY - rect.top - 60;

    const distance = Math.sqrt(x * x + y * y);
    const max = 40;

    if (distance > max) {
      x = (x / distance) * max;
      y = (y / distance) * max;
    }

    stick.style.left = x + 60 - 20 + "px";
    stick.style.top = y + 60 - 20 + "px";

    joystick.dx = x / max;
    joystick.dy = y / max;
  });

  base.addEventListener("touchend", () => {
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    stick.style.left = "40px";
    stick.style.top = "40px";
  });

  showScreen("loginScreen");
  gameLoop();
};

window.addEventListener("resize", resizeCanvas);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").then(reg => {
    console.log("Service Worker Registered");

    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });
  });
}

async function loadPlayerCards(){

let user = localStorage.getItem("gv_user")

if(!user) return

const { data, error } = await supabaseClient
.from("player_cards")
.select("serial, card_id")
.eq("player_id", user)

if(error){
console.error(error)
return
}

playerCards = []

for(const entry of data){

let cardInfo = cards.find(c => c.id === entry.card_id)

if(cardInfo){

playerCards.push({
...cardInfo,
serial: entry.serial
})

}

}

}