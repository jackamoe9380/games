/*
 * AUTOMATIC NES GAME LIBRARY
 *
 * Looks through the /games folder on GitHub,
 * finds every .nes file, and creates the game list.
 *
 * This assumes the repository is being served by
 * GitHub Pages.
 */


/* =========================================
   SETTINGS
========================================= */

// The folder containing your ROM files.
const ROM_FOLDER = "games";

// Optional folder containing game pictures.
//
// If you don't have an images folder yet,
// the game cards will simply have no picture.
const IMAGE_FOLDER = "images";


/* =========================================
   PAGE ELEMENTS
========================================= */

const gameListScreen = document.getElementById("game-list-screen");
const gameList = document.getElementById("game-list");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");

const gameScreen = document.getElementById("game-screen");
const nesContainer = document.getElementById("nes-container");
const backButton = document.getElementById("back-button");
const gameTitle = document.getElementById("game-title");
const gameLoading = document.getElementById("game-loading");


/* =========================================
   GET GITHUB REPOSITORY INFORMATION
========================================= */

function getRepositoryInfo() {

    const host = window.location.hostname;

    // Expected GitHub Pages format:
    // username.github.io

    if (!host.endsWith(".github.io")) {
        throw new Error(
            "This automatic folder scanner is designed for GitHub Pages."
        );
    }

    const username = host.split(".")[0];

    /*
     * pathname examples:
     *
     * https://username.github.io/
     *
     * or
     *
     * https://username.github.io/my-project/
     */

    const pathParts = window.location.pathname
        .split("/")
        .filter(part => part.length > 0);

    let repository;

    if (pathParts.length > 0) {
        repository = pathParts[0];
    } else {
        repository = username + ".github.io";
    }

    return {
        username: username,
        repository: repository
    };
}


/* =========================================
   TURN FILENAME INTO GAME NAME
========================================= */

function makeGameName(filename) {

    /*
     * Remove .nes
     */
    let name = filename.replace(/\.nes$/i, "");

    /*
     * Replace underscores with spaces
     */
    name = name.replace(/_/g, " ");

    /*
     * Make everything uppercase
     */
    name = name.toUpperCase();

    return name;
}


/* =========================================
   FIND ALL NES FILES
========================================= */

async function findGames() {

    const repo = getRepositoryInfo();

    /*
     * GitHub's contents API lets us see the files
     * inside the games folder.
     */
    const apiURL =
        `https://api.github.com/repos/${repo.username}/${repo.repository}/contents/${ROM_FOLDER}`;

    const response = await fetch(apiURL);

    if (!response.ok) {

        throw new Error(
            `Could not read the "${ROM_FOLDER}" folder. ` +
            `GitHub returned status ${response.status}.`
        );
    }

    const files = await response.json();

    /*
     * Only keep .nes files.
     */
    const games = files
        .filter(file =>
            file.type === "file" &&
            file.name.toLowerCase().endsWith(".nes")
        )
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        );

    return games;
}


/* =========================================
   CREATE GAME CARD
========================================= */

function createGameCard(game) {

    const card = document.createElement("div");

    card.className = "game-card";

    const name = makeGameName(game.name);

    /*
     * Try to find an image with the same filename.
     *
     * Example:
     *
     * games/Burger_time.nes
     *
     * looks for:
     *
     * images/Burger_time.png
     */

    const imageName = game.name.replace(/\.nes$/i, ".png");

    const image = document.createElement("img");

    image.src = `${IMAGE_FOLDER}/${imageName}`;

    image.alt = name;

    /*
     * If the image doesn't exist, hide it.
     */
    image.onerror = function () {
        image.style.display = "none";
    };

    const title = document.createElement("div");

    title.className = "game-name";
    title.textContent = name;

    card.appendChild(image);
    card.appendChild(title);

    /*
     * When clicked, start the game.
     */
    card.addEventListener("click", function () {

        startGame(game.download_url, name);

    });

    return card;
}


/* =========================================
   START A GAME
========================================= */

async function startGame(romURL, name) {

    /*
     * Switch from the game list to the player.
     */
    gameListScreen.style.display = "none";
    gameScreen.style.display = "block";

    gameTitle.textContent = name;
    gameLoading.style.display = "flex";

    /*
     * Remove the previous emulator.
     */
    nesContainer.innerHTML = "";

    try {

        console.log("Loading:", romURL);

        const response = await fetch(romURL);

        if (!response.ok) {

            throw new Error(
                `Could not download ROM. HTTP ${response.status}`
            );
        }

        const buffer = await response.arrayBuffer();

        const romBytes = new Uint8Array(buffer);

        /*
         * JSNES expects the ROM as a binary string.
         */
        let romBinaryString = "";

        for (let i = 0; i < romBytes.length; i++) {

            romBinaryString += String.fromCharCode(
                romBytes[i]
            );

        }


        /*
         * Start JSNES.
         */
        new jsnes.Browser({

            container: nesContainer,

            romData: romBinaryString

        });


        gameLoading.style.display = "none";

        console.log(
            `${name} successfully loaded.`
        );


        /*
         * Try to enter browser fullscreen.
         *
         * Some browsers may require the user to
         * interact before fullscreen is allowed.
         */
        try {

            if (gameScreen.requestFullscreen) {
                await gameScreen.requestFullscreen();
            }

        } catch (fullscreenError) {

            console.log(
                "Browser fullscreen was not available."
            );

        }

    } catch (error) {

        console.error(
            "Emulator Boot Failure:",
            error
        );

        gameLoading.textContent =
            "FAILED TO LOAD GAME";

        alert(
            "Failed to load " +
            name +
            ":\n\n" +
            error.message
        );

    }
}


/* =========================================
   BACK BUTTON
========================================= */

backButton.addEventListener("click", function () {

    /*
     * Leave browser fullscreen if we're in it.
     */
    if (document.fullscreenElement) {

        document.exitFullscreen().catch(() => {});

    }

    /*
     * Remove the emulator.
     */
    nesContainer.innerHTML = "";

    /*
     * Return to game list.
     */
    gameScreen.style.display = "none";
    gameListScreen.style.display = "block";

    gameTitle.textContent = "";

});


/* =========================================
   LOAD THE GAME LIST
========================================= */

async function loadGameList() {

    try {

        const games = await findGames();

        loading.style.display = "none";

        if (games.length === 0) {

            errorBox.style.display = "block";

            errorBox.textContent =
                `No .nes files were found in the "${ROM_FOLDER}" folder.`;

            return;
        }


        /*
         * Create a card for every ROM.
         */
        for (const game of games) {

            const card = createGameCard(game);

            gameList.appendChild(card);

        }

        console.log(
            `Found ${games.length} NES games.`
        );

    } catch (error) {

        console.error(error);

        loading.style.display = "none";

        errorBox.style.display = "block";

        errorBox.textContent =
            "Could not load the game list:\n\n" +
            error.message;

    }

}


/* =========================================
   START
========================================= */

loadGameList();
