const SUPABASE_URL = "https://rtvfxoqrhypuaktlegcr.supabase.co";
const SUPABASE_KEY = "sb_publishable_UgxzqZ4oe8M0w2axk3rgOw_VMJaXt5q";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let coins = 0;
let playerCards = [];
let startX = 0;
let swiped = false;
let defenders = [];
let spawnTimer = 0;
let gameRunning = false;
let yards = 0;
let fieldScroll = 0;
let packPrice = 0;

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

  if(screen === "slotsScreen"){
  document.getElementById("slotsCoins").innerText = coins
}
}

function spinSlots(){

if(coins < 20){
alert("Not enough coins to play this game")
return
}

coins -= 20

const symbols = ["🏈","🏆","🔥","💎"]

let s1 = symbols[Math.floor(Math.random()*symbols.length)]
let s2 = symbols[Math.floor(Math.random()*symbols.length)]
let s3 = symbols[Math.floor(Math.random()*symbols.length)]

document.getElementById("slotDisplay").innerText = `${s1} | ${s2} | ${s3}`

let reward = 0
let resultText = "❌ You lost!"

if(s1 === s2 && s2 === s3){

if(s1 === "🏈"){
reward = 40
resultText = "🏈 Small Win!"
}
else if(s1 === "🏆"){
reward = 80
resultText = "🏆 Big Win!"
}
else if(s1 === "💎"){
reward = 250
resultText = "💎 JACKPOT!!!"
}
else{
reward = 60
resultText = "🔥 Bonus Win!"
}

}

coins += reward

document.getElementById("slotResult").innerText = resultText + " +" + reward

updateCoins()
saveGame()

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

async function saveGame() {
  localStorage.setItem("gv_coins", coins);
  localStorage.setItem("gv_cards", JSON.stringify(playerCards));

  const user = localStorage.getItem("gv_user");

  if (user) {
    const { error } = await supabaseClient
  .from("players")
  .update({ coins: coins })
  .eq("id", user);

if (error) {
  console.error("SAVE COINS ERROR:", error);
}
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

  if (savedCoins) {
    coins = parseInt(savedCoins, 10);
  }

  if (savedCards) {
    playerCards = JSON.parse(savedCards);
  }

  updateCoins();
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

async function gameOver() {
  if (!gameRunning) return;

  gameRunning = false;

  const earnedCoins = Math.floor(yards / 5);
  coins += earnedCoins;

  updateCoins();
  await saveGame();

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

async function spawnPack() {
  if (coins < packPrice) {
    alert("Not enough coins");
    return;
  }

  coins -= packPrice;
  updateCoins();
  await saveGame();

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

let user = localStorage.getItem("gv_user")

if(!user){
alert("You must login first")
return
}

const pulledCards = []

for(let i=0;i<1;i++){

const { data, error } = await supabaseClient
.rpc("open_pack",{ player: user })

if(error){
console.error("PACK ERROR:", error)
alert("Pack error: " + error.message)
return
}

const card = data[0]

pulledCards.push({
name: card.name,
image: card.image,
serial: card.serial
})

}

// hide pack
document.getElementById("packArea").style.display = "none"

// reset result area
const result = document.getElementById("packResult")
result.innerHTML = ""
result.style.display = "block"

// reveal cards
revealCards(pulledCards)

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
      img.src = card.image;
      img.dataset.revealed = "true";
    });

    cardDiv.addEventListener("click", e => {
      e.preventDefault();
      if (img.dataset.revealed) return;
      img.src = card.image;
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

const { data, error } = await supabaseClient
.from("player_cards")
.select(`
serial_number,
cards (
name,
image,
team,
height,
weight,
position,
set,
logo,
college
)
`)
.eq("player_id", user)

const area = document.getElementById("collectionList")
area.innerHTML = ""

if(!data || data.length === 0){
area.innerHTML = "<p>No cards yet</p>"
return
}

data.forEach((entry,index) => {

area.innerHTML += `
<div class="collectionCard" id="card${index}">
<div class="cardInner">

<div class="cardFront">
<img src="${entry.cards.image}">
</div>

<div class="cardBack">
  <img src="${entry.cards.logo}" class="cardLogo">
  <div class="cardName">${entry.cards.name}</div>
  <div>Team: ${entry.cards.team}</div>
  <div>Height: ${entry.cards.height}</div>
  <div>Weight: ${entry.cards.weight}</div>
  <div>Position: ${entry.cards.position}</div>
  <div>College: ${entry.cards.college}</div>
  <div>Set: ${entry.cards.set}</div>
  <div class="cardSerial">#${entry.serial_number}</div>
</div>

</div>
</div>
`

})

setTimeout(()=>{

data.forEach((entry,index)=>{

let element = document.getElementById("card"+index)

handleCardTouch(element,{
...entry.cards,
serial: entry.serial_number
})

})

},50)

}

let lastTapTime = 0;

function handleCardTouch(cardElement, cardData){

let pressTimer = null
let longPress = false

cardElement.addEventListener("touchstart", e => {
e.preventDefault()

pressTimer = setTimeout(()=>{
longPress = true
inspectCard(cardData)
},600)

})

cardElement.addEventListener("touchend", e => {

e.preventDefault()  // 🔥 THIS STOPS iOS ZOOM

clearTimeout(pressTimer)

if(longPress){
longPress = false
return
}

const now = Date.now()

if(now - lastTapTime < 300){
cardElement.classList.toggle("flipped")
}

lastTapTime = now

})

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

document.getElementById("profileUsername").innerText = "User: " + data.username
document.getElementById("profileCoins").innerText = "Coins: " + data.coins

localStorage.setItem("gv_user", data.id)
localStorage.setItem("gv_username", data.username)

coins = data.coins || 0
updateCoins()

await loadPlayerCards()
await loadFriends()

showScreen("menuScreen")

}

function loadProfile(){

let username = localStorage.getItem("gv_username")
let coinsStored = localStorage.getItem("gv_coins")

if(username){
document.getElementById("profileUsername").innerText = "User: " + username
}

if(coinsStored){
document.getElementById("profileCoins").innerText = "Coins: " + coinsStored
}

}

window.onload = function () {
  resizeCanvas();
  checkGameVersion();
  loadGame();
  loadProfile()

  const pack = document.getElementById("packImage");

  const profileBtn = document.getElementById("profileBtn")

if(profileBtn){
profileBtn.onclick = () => {
showScreen("profileScreen")
}
}

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

async function addFriend(){

let username = document.getElementById("friendInput").value.trim()
let user = localStorage.getItem("gv_user")

if(!username){
alert("Enter username")
return
}

// find friend
const { data: friend, error: findError } = await supabaseClient
.from("players")
.select("id")
.eq("username", username)
.single()

if(findError || !friend){
alert("User not found")
return
}

// insert
const { data, error } = await supabaseClient
.from("friends")
.insert([
{
player_id: user,
friend_id: friend.id
}
])
.select()

console.log("INSERT RESULT:", data, error)

if(error){
alert("Error adding friend")
return
}

alert("Friend added!")

loadFriends()

}

async function loadFriends(){

let user = localStorage.getItem("gv_user")
if(!user) return

const list = document.getElementById("friendsList")
list.innerHTML = ""

const { data, error } = await supabaseClient
.from("friends")
.select("friend_id")
.eq("player_id", user)

if(error){
console.error("LOAD FRIENDS ERROR:", error)
list.innerHTML = "<p>Error loading friends</p>"
return
}

if(!data || data.length === 0){
list.innerHTML = "<p>No friends yet</p>"
return
}

// now fetch usernames manually
for(const f of data){

const { data: player } = await supabaseClient
.from("players")
.select("username")
.eq("id", f.friend_id)
.single()

if(player){
list.innerHTML += `<p>${player.username}</p>`
}

}

}

async function loadPlayerCards(){

let user = localStorage.getItem("gv_user")
if(!user) return

const { data, error } = await supabaseClient
.from("player_cards")
.select(`
serial_number,
cards (
name,
image,
team,
height,
weight,
position,
set,
logo,
college
)
`)
.eq("player_id", user)

if(error){
console.error(error)
return
}

playerCards = data.map(entry => ({
...entry.cards,
serial: entry.serial_number
}))

}