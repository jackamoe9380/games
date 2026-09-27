"use strict";

/*
 * ==========================================
 * NES GAME LIBRARY
 * EmulatorJS + Nestopia
 * ==========================================
 */

const ROM_FOLDER = "games";
const IMAGE_FOLDER = "images";

/*
 * EmulatorJS files.

 * We use the stable EmulatorJS CDN rather than
 * putting the emulator's large WASM files in
 * your GitHub repository.
 */
const EMULATOR_DATA_PATH =
    "https://cdn.emulatorjs.org/stable/data/";


/* ==========================================
   PAGE ELEMENTS
   ========================================== */

const gameListScreen = document.getElementById("game-list-screen");
const gameScreen = document.getElementById("game-screen");

const gameList = document.getElementById("game-list");
const gameStatus = document.getElementById("game-status");

const gameSearch = document.getElementById("game-search");

const backButton = document.getElementById("back-button");
const gameTitle = document.getElementById("game-title");

const nesContainer = document.getElementById("nes-container");
const gameContainer = document.getElementById("game");
const gameLoading = document.getElementById("game-loading");


/* ==========================================
   GAME DATA
   ========================================== */

let allGames = [];

/*
 * Every time a game starts/stops this number
 * increases.

 * This prevents an old asynchronous emulator
 * load from appearing after the user has already
 * gone back or selected another game.
 */
let gameLoadId = 0;


/* ==========================================
   GITHUB REPOSITORY INFORMATION
   ========================================== */

function getRepositoryInfo() {

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    /*
     * GitHub Pages normally looks like:

     * username.github.io/repository/
     *
     * or:
     *
     * username.github.io/
     */

    if (!hostname.endsWith(".github.io")) {
        throw new Error(
            "This game library must be hosted on GitHub Pages."
        );
    }

    const username = hostname.split(".")[0];

    const pathParts = pathname
        .split("/")
        .filter(Boolean);

    /*
     * If the site is a project page, the first
     * path component is the repository name.
     */
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
   IMAGE URL
   ========================================== */

function getImageURL(filename) {

    const baseName = filename.replace(/\.nes$/i, "");

    /*
     * GitHub Pages paths are case-sensitive.
     * We use the same filename as the ROM.
     */
    return `${IMAGE_FOLDER}/${encodeURIComponent(baseName)}.png`;
}


/* ==========================================
   FIND GAMES
   ========================================== */

async function findGames() {

    const { username, repository } =
        getRepositoryInfo();

    const apiURL =
        `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repository)}/contents/${encodeURIComponent(ROM_FOLDER)}`;

    const response = await fetch(apiURL, {
        headers: {
            "Accept": "application/vnd.github+json"
        }
    });

    if (!response.ok) {

        throw new Error(
            `GitHub API returned ${response.status}`
        );
    }

    const files = await response.json();

    return files
        .filter(file =>
            file.type === "file" &&
            file.name.toLowerCase().endsWith(".nes")
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
   CREATE GAME CARD
   ========================================== */

function createGameCard(game) {

    const card = document.createElement("div");

    card.className = "game-card";

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const image = document.createElement("img");

    image.className = "game-image";

    image.alt = game.name;

    image.loading = "lazy";

    image.src = game.imageURL;

    /*
     * If no picture exists, hide the broken image
     * instead of showing the browser's broken-image
     * icon.
     */
    image.onerror = function () {
        this.style.display = "none";
    };


    const name = document.createElement("div");

    name.className = "game-name";

    name.textContent = game.name;


    card.appendChild(image);
    card.appendChild(name);


    card.addEventListener("click", () => {
        startGame(game);
    });


    card.addEventListener("keydown", event => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            startGame(game);
        }
    });


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

        noResults.className = "no-results";

        noResults.textContent =
            "No games found.";

        gameList.appendChild(noResults);

        gameStatus.style.display = "none";

        return;
    }

    gameStatus.style.display = "none";

    const fragment =
        document.createDocumentFragment();

    games.forEach(game => {

        fragment.appendChild(
            createGameCard(game)
        );

    });

    gameList.appendChild(fragment);
}


/* ==========================================
   SEARCH
   ========================================== */

gameSearch.addEventListener("input", () => {

    const search =
        gameSearch.value
            .trim()
            .toUpperCase();

    if (!search) {

        displayGames(allGames);

        return;
    }

    const filtered =
        allGames.filter(game =>
            game.name.includes(search)
        );

    displayGames(filtered);
});


/* ==========================================
   REMOVE OLD EMULATOR
   ========================================== */

function stopGame() {

    /*
     * Invalidate any previous asynchronous load.
     */
    gameLoadId++;


    /*
     * Remove the EmulatorJS-created DOM.
     */
    gameContainer.innerHTML = "";


    /*
     * Remove any emulator scripts that we
     * dynamically added.
     */
    document
        .querySelectorAll(
            'script[data-emulatorjs-loader="true"]'
        )
        .forEach(script => {
            script.remove();
        });


    /*
     * Remove old emulator-generated elements
     * that may have been attached outside #game.
     */
    document
        .querySelectorAll(
            '[data-emulatorjs-created="true"]'
        )
        .forEach(element => {
            element.remove();
        });


    /*
     * Clear EmulatorJS global variables.
     */
    window.EJS_player = undefined;
    window.EJS_gameUrl = undefined;
    window.EJS_gameName = undefined;
    window.EJS_core = undefined;
    window.EJS_biosUrl = undefined;
    window.EJS_pathtodata = undefined;
    window.EJS_startOnLoaded = undefined;
    window.EJS_askBeforeExit = undefined;
    window.EJS_onExit = undefined;


    /*
     * Hide the loading message.
     */
    gameLoading.style.display = "none";
}


/* ==========================================
   START GAME
   ========================================== */

function startGame(game) {

    /*
     * Stop anything that was previously running.
     */
    stopGame();


    /*
     * Create a unique ID for this load.
     */
    const thisLoadId = gameLoadId;


    /*
     * Show game screen.
     */
    gameListScreen.style.display = "none";
    gameScreen.style.display = "block";


    /*
     * Update title.
     */
    gameTitle.textContent = game.name;


    /*
     * Show loading message.
     */
    gameLoading.textContent =
        `Loading ${game.name}...`;

    gameLoading.style.display = "flex";


    /*
     * Scroll to the emulator.
     */
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    /*
     * Give the browser a moment to display the
     * game screen before loading the emulator.
     */
    setTimeout(() => {

        /*
         * User may have pressed Back while the
         * timeout was waiting.
         */
        if (thisLoadId !== gameLoadId) {
            return;
        }


        loadEmulator(game, thisLoadId);

    }, 50);
}


/* ==========================================
   LOAD EMULATORJS
   ========================================== */

function loadEmulator(game, thisLoadId) {

    /*
     * EmulatorJS settings.

     * These globals must exist BEFORE loader.js
     * is inserted into the page.
     */

    window.EJS_player = "#game";

    window.EJS_gameName =
        game.name;

    window.EJS_gameUrl =
        game.romURL;

    /*
     * IMPORTANT:
     *
     * "nestopia" selects the Nestopia NES core.
     *
     * Do NOT change this to "nes" if you specifically
     * want Nestopia.
     */
    window.EJS_core = "nestopia";

    window.EJS_biosUrl = "";

    window.EJS_pathtodata =
        EMULATOR_DATA_PATH;

    /*
     * Start automatically once the core and ROM
     * have loaded.
     */
    window.EJS_startOnLoaded = true;

    /*
     * Don't ask for confirmation when leaving
     * the emulator.
     */
    window.EJS_askBeforeExit = false;


    /*
     * EmulatorJS calls this when its emulator exits.
     */
    window.EJS_onExit = function () {

        if (thisLoadId !== gameLoadId) {
            return;
        }

        gameContainer.innerHTML = "";

        gameLoading.textContent =
            "Game closed.";

        gameLoading.style.display = "flex";
    };


    /*
     * Create the EmulatorJS loader script.
     */
    const script =
        document.createElement("script");

    script.src =
        `${EMULATOR_DATA_PATH}loader.js`;

    script.async = true;

    script.dataset.emulatorjsLoader =
        "true";


    /*
     * If the loader itself fails, give a useful
     * error rather than leaving a blank screen.
     */
    script.onerror = function () {

        if (thisLoadId !== gameLoadId) {
            return;
        }

        gameLoading.textContent =
            "EmulatorJS could not be loaded. Check your internet connection or try again.";

        gameLoading.style.display = "flex";

        console.error(
            "Could not load EmulatorJS:",
            script.src
        );
    };


    /*
     * Once the script has loaded, the emulator
     * normally creates its own interface.
     */
    script.onload = function () {

        if (thisLoadId !== gameLoadId) {
            return;
        }

        /*
         * Give EmulatorJS a moment to initialize
         * before removing our loading overlay.
         */
        setTimeout(() => {

            if (thisLoadId !== gameLoadId) {
                return;
            }

            gameLoading.style.display = "none";

        }, 1000);
    };


    document.body.appendChild(script);
}


/* ==========================================
   BACK BUTTON
   ========================================== */

backButton.addEventListener("click", () => {

    stopGame();


    /*
     * Switch back to game list.
     */
    gameScreen.style.display = "none";
    gameListScreen.style.display = "block";


    /*
     * Clear search so the full library is shown.
     */
    gameSearch.value = "";

    displayGames(allGames);


    /*
     * Return to the top of the library.
     */
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


/* ==========================================
   INITIAL LOAD
   ========================================== */

async function loadGameList() {

    try {

        gameStatus.textContent =
            "Loading games...";

        gameStatus.style.display =
            "block";


        allGames = await findGames();


        if (allGames.length === 0) {

            gameStatus.textContent =
                "No .nes games were found in the games folder.";

            return;
        }


        displayGames(allGames);

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


loadGameList();
