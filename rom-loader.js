"use strict";

const ROM_FOLDER = "games";
const IMAGE_FOLDER = "images";

const EMULATOR_DATA_PATH =
    "https://cdn.emulatorjs.org/stable/data/";

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

let allGames = [];
let gameLoadId = 0;


/* ==========================================
   GITHUB REPOSITORY
   ========================================== */

function getRepositoryInfo() {

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (!hostname.endsWith(".github.io")) {
        throw new Error(
            "This game library must be hosted on GitHub Pages."
        );
    }

    const username = hostname.split(".")[0];

    const pathParts = pathname
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

    const response = await fetch(apiURL, {
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
   GAME CARD
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

        noResults.className =
            "no-results";

        noResults.textContent =
            "No games found.";

        gameList.appendChild(noResults);

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

    gameList.appendChild(fragment);
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
            displayGames(allGames);
            return;
        }

        const filtered =
            allGames.filter(game =>
                game.name.includes(search)
            );

        displayGames(filtered);
    }
);


/* ==========================================
   STOP EMULATOR
   ========================================== */

function stopGame() {

    /*
     * Invalidate any pending game load.
     */
    gameLoadId++;


    /*
     * EmulatorJS exposes its player through
     * EJS_emulator when it has initialized.
     *
     * Try its shutdown methods if available.
     */
    try {

        if (
            window.EJS_emulator &&
            typeof window.EJS_emulator.exit === "function"
        ) {

            window.EJS_emulator.exit();
        }

    } catch (error) {

        console.warn(
            "EmulatorJS exit warning:",
            error
        );
    }


    try {

        if (
            window.EJS_emulator &&
            typeof window.EJS_emulator.stop === "function"
        ) {

            window.EJS_emulator.stop();
        }

    } catch (error) {

        console.warn(
            "EmulatorJS stop warning:",
            error
        );
    }


    /*
     * Remove the emulator DOM.
     */
    gameContainer.innerHTML = "";


    /*
     * Remove dynamically loaded EmulatorJS
     * script.
     */
    document
        .querySelectorAll(
            'script[data-emulatorjs-loader="true"]'
        )
        .forEach(script => {
            script.remove();
        });


    /*
     * Clear EmulatorJS globals.
     */
    try {

        delete window.EJS_player;
        delete window.EJS_gameName;
        delete window.EJS_gameUrl;
        delete window.EJS_core;
        delete window.EJS_biosUrl;
        delete window.EJS_pathtodata;
        delete window.EJS_startOnLoaded;
        delete window.EJS_askBeforeExit;
        delete window.EJS_onExit;

    } catch (error) {

        console.warn(
            "Could not clear EmulatorJS settings:",
            error
        );
    }


    /*
     * Reset the loading message.
     */
    gameLoading.style.display =
        "none";
}


/* ==========================================
   START GAME
   ========================================== */

function startGame(game) {

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
            thisLoadId !== gameLoadId
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

    window.EJS_player =
        "#game";

    window.EJS_gameName =
        game.name;

    window.EJS_gameUrl =
        game.romURL;

    /*
     * Nestopia.
     */
    window.EJS_core =
        "nestopia";

    window.EJS_biosUrl =
        "";

    window.EJS_pathtodata =
        EMULATOR_DATA_PATH;

    window.EJS_startOnLoaded =
        true;

    window.EJS_askBeforeExit =
        false;


    window.EJS_onExit =
        function () {

            if (
                thisLoadId !== gameLoadId
            ) {
                return;
            }

            gameContainer.innerHTML = "";

        };


    const script =
        document.createElement("script");

    script.src =
        `${EMULATOR_DATA_PATH}loader.js`;

    script.async =
        true;

    script.dataset.emulatorjsLoader =
        "true";


    script.onerror =
        function () {

            if (
                thisLoadId !== gameLoadId
            ) {
                return;
            }

            gameLoading.textContent =
                "EmulatorJS could not be loaded.";

            gameLoading.style.display =
                "flex";

            console.error(
                "Could not load EmulatorJS:",
                script.src
            );
        };


    script.onload =
        function () {

            if (
                thisLoadId !== gameLoadId
            ) {
                return;
            }

            /*
             * Give the emulator time to initialize.
             */
            setTimeout(() => {

                if (
                    thisLoadId !== gameLoadId
                ) {
                    return;
                }

                gameLoading.style.display =
                    "none";

            }, 1000);
        };


    document.body.appendChild(script);
}


/* ==========================================
   BACK BUTTON
   ========================================== */

backButton.addEventListener(
    "click",
    () => {

        /*
         * Actually stop the emulator first.
         */
        stopGame();


        /*
         * Return to library.
         */
        gameScreen.style.display =
            "none";

        gameListScreen.style.display =
            "block";


        /*
         * Reset search.
         */
        gameSearch.value = "";

        displayGames(allGames);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


/* ==========================================
   INITIALIZE
   ========================================== */

async function loadGameList() {

    try {

        gameStatus.textContent =
            "Loading games...";

        gameStatus.style.display =
            "block";

        allGames =
            await findGames();

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
