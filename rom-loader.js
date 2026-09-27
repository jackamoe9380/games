"use strict";

/*
 * ==========================================
 * NES GAME LIBRARY
 * EmulatorJS + Nestopia
 * ==========================================
 */

const ROM_FOLDER = "games";
const IMAGE_FOLDER = "images";

const EMULATOR_DATA_PATH =
    "https://cdn.emulatorjs.org/stable/data/";


/* ==========================================
   PAGE ELEMENTS
   ========================================== */

const gameListScreen =
    document.getElementById("game-list-screen");

const gameScreen =
    document.getElementById("game-screen");

const gameList =
    document.getElementById("game-list");

const gameStatus =
    document.getElementById("game-status");

const gameSearch =
    document.getElementById("game-search");

const backButton =
    document.getElementById("back-button");

const gameTitle =
    document.getElementById("game-title");

const emulatorFrame =
    document.getElementById("emulator-frame");

const gameLoading =
    document.getElementById("game-loading");


/* ==========================================
   GAME DATA
   ========================================== */

let allGames = [];

let gameLoadId = 0;


/* ==========================================
   GITHUB INFORMATION
   ========================================== */

function getRepositoryInfo() {

    const hostname =
        window.location.hostname;

    const pathname =
        window.location.pathname;

    if (!hostname.endsWith(".github.io")) {

        throw new Error(
            "This game library must be hosted on GitHub Pages."
        );
    }

    const username =
        hostname.split(".")[0];

    const pathParts =
        pathname
            .split("/")
            .filter(Boolean);

    const repository =
        pathParts.length > 0
            ? pathParts[0]
            : `${username}.github.io`;

    return {
        username,
        repository
    };
}


/* ==========================================
   GAME NAME
   ========================================== */

function makeGameName(filename) {

    return filename
        .replace(/\.nes$/i, "")
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}


/* ==========================================
   IMAGE
   ========================================== */

function getImageURL(filename) {

    const baseName =
        filename.replace(/\.nes$/i, "");

    return `${IMAGE_FOLDER}/${encodeURIComponent(baseName)}.png`;
}


/* ==========================================
   FIND GAMES
   ========================================== */

async function findGames() {

    const {
        username,
        repository
    } = getRepositoryInfo();

    const apiURL =
        `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repository)}/contents/${encodeURIComponent(ROM_FOLDER)}`;

    const response =
        await fetch(apiURL, {
            headers: {
                "Accept":
                    "application/vnd.github+json"
            }
        });

    if (!response.ok) {

        throw new Error(
            `GitHub API returned ${response.status}`
        );
    }

    const files =
        await response.json();

    return files
        .filter(file =>
            file.type === "file" &&
            file.name
                .toLowerCase()
                .endsWith(".nes")
        )
        .map(file => ({
            filename: file.name,
            name: makeGameName(file.name),
            romURL: file.download_url,
            imageURL: getImageURL(file.name)
        }))
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        );
}


/* ==========================================
   GAME CARD
   ========================================== */

function createGameCard(game) {

    const card =
        document.createElement("div");

    card.className =
        "game-card";

    card.setAttribute(
        "role",
        "button"
    );

    card.setAttribute(
        "tabindex",
        "0"
    );


    const image =
        document.createElement("img");

    image.className =
        "game-image";

    image.alt =
        game.name;

    image.loading =
        "lazy";

    image.src =
        game.imageURL;

    image.onerror =
        function () {
            this.style.display =
                "none";
        };


    const name =
        document.createElement("div");

    name.className =
        "game-name";

    name.textContent =
        game.name;


    card.appendChild(image);
    card.appendChild(name);


    card.addEventListener(
        "click",
        () => startGame(game)
    );


    card.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                startGame(game);
            }
        }
    );


    return card;
}


/* ==========================================
   DISPLAY GAMES
   ========================================== */

function displayGames(games) {

    gameList.innerHTML = "";

    if (games.length === 0) {

        const noResults =
            document.createElement("div");

        noResults.className =
            "no-results";

        noResults.textContent =
            "No games found.";

        gameList.appendChild(
            noResults
        );

        gameStatus.style.display =
            "none";

        return;
    }

    gameStatus.style.display =
        "none";


    const fragment =
        document.createDocumentFragment();


    games.forEach(game => {

        fragment.appendChild(
            createGameCard(game)
        );

    });


    gameList.appendChild(
        fragment
    );
}


/* ==========================================
   SEARCH
   ========================================== */

gameSearch.addEventListener(
    "input",
    () => {

        const search =
            gameSearch.value
                .trim()
                .toUpperCase();


        if (!search) {

            displayGames(
                allGames
            );

            return;
        }


        const filtered =
            allGames.filter(game =>
                game.name.includes(search)
            );


        displayGames(
            filtered
        );
    }
);


/* ==========================================
   COMPLETELY DESTROY EMULATOR
   ========================================== */

function stopGame() {

    /*
     * Invalidate all previous loading operations.
     */
    gameLoadId++;


    /*
     * IMPORTANT:
     *
     * Removing the iframe completely destroys
     * the browsing context containing EmulatorJS.
     *
     * This stops its JavaScript, WebAssembly,
     * audio and animation loops.
     */
    emulatorFrame.src =
        "about:blank";

    emulatorFrame.remove();


    /*
     * Create a brand-new iframe for the next game.
     */
    const newFrame =
        document.createElement("iframe");

    newFrame.id =
        "emulator-frame";

    newFrame.title =
        "NES Emulator";

    newFrame.allow =
        "autoplay; fullscreen";

    nesContainer.insertBefore(
        newFrame,
        gameLoading
    );


    /*
     * Update our reference.
     */
    window.emulatorFrame =
        newFrame;
}


/* ==========================================
   START GAME
   ========================================== */

function startGame(game) {

    /*
     * Kill any previous emulator first.
     */
    stopGame();


    const thisLoadId =
        gameLoadId;


    gameListScreen.style.display =
        "none";

    gameScreen.style.display =
        "block";


    gameTitle.textContent =
        game.name;


    gameLoading.textContent =
        `Loading ${game.name}...`;

    gameLoading.style.display =
        "flex";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    setTimeout(() => {

        if (
            thisLoadId !==
            gameLoadId
        ) {
            return;
        }


        loadEmulator(
            game,
            thisLoadId
        );

    }, 50);
}


/* ==========================================
   LOAD EMULATORJS
   ========================================== */

function loadEmulator(
    game,
    thisLoadId
) {

    /*
     * Get the current iframe.
     */
    const frame =
        document.getElementById(
            "emulator-frame"
        );


    if (!frame) {
        return;
    }


    /*
     * Put a complete HTML document inside
     * the iframe.

     * This isolates EmulatorJS from the main
     * game-library page.
     */
    const emulatorHTML = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<style>

html,
body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: black;
}

#game {
    width: 100%;
    height: 100%;
}

</style>

</head>

<body>

<div id="game"></div>

<script>

window.EJS_player = "#game";

window.EJS_gameName =
    ${JSON.stringify(game.name)};

window.EJS_gameUrl =
    ${JSON.stringify(game.romURL)};

window.EJS_core =
    "nestopia";

window.EJS_biosUrl =
    "";

window.EJS_pathtodata =
    ${JSON.stringify(EMULATOR_DATA_PATH)};

window.EJS_startOnLoaded =
    true;

window.EJS_askBeforeExit =
    false;

<\/script>

<script
    src="${EMULATOR_DATA_PATH}loader.js"
><\/script>

</body>
</html>
`;


    /*
     * Write the emulator page into the iframe.
     */
    frame.srcdoc =
        emulatorHTML;


    /*
     * Once the iframe loads, remove our loading
     * overlay after EmulatorJS has had time to
     * initialize.
     */
    frame.addEventListener(
        "load",
        () => {

            if (
                thisLoadId !==
                gameLoadId
            ) {
                return;
            }


            setTimeout(() => {

                if (
                    thisLoadId !==
                    gameLoadId
                ) {
                    return;
                }


                gameLoading.style.display =
                    "none";

            }, 1500);

        },
        {
            once: true
        }
    );
}


/* ==========================================
   BACK BUTTON
   ========================================== */

backButton.addEventListener(
    "click",
    () => {

        /*
         * This completely destroys the iframe
         * containing the emulator.
         */
        stopGame();


        gameScreen.style.display =
            "none";

        gameListScreen.style.display =
            "block";


        gameSearch.value =
            "";


        displayGames(
            allGames
        );


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


/* ==========================================
   LOAD GAME LIST
   ========================================== */

async function loadGameList() {

    try {

        gameStatus.textContent =
            "Loading games...";

        gameStatus.style.display =
            "block";


        allGames =
            await findGames();


        if (
            allGames.length === 0
        ) {

            gameStatus.textContent =
                "No .nes games were found in the games folder.";

            return;
        }


        displayGames(
            allGames
        );

    } catch (error) {

        console.error(
            "Could not load game list:",
            error
        );


        gameStatus.innerHTML =
            `Could not load the game list.<br><br>
             <small>${error.message}</small>`;


        gameStatus.style.display =
            "block";
    }
}


/* ==========================================
   START
   ========================================== */

loadGameList();
