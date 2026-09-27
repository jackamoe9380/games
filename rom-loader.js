/*
 * AUTOMATIC NES GAME LIBRARY
 *
 * Looks through the /games folder on GitHub,
 * finds every .nes file, and creates the game list.
 *
 * GitHub Pages version.
 */


/* =========================================
   SETTINGS
========================================= */

const ROM_FOLDER = "games";
const IMAGE_FOLDER = "images";


/* =========================================
   PAGE ELEMENTS
========================================= */

const gameListScreen = document.getElementById("game-list-screen");
const gameList = document.getElementById("game-list");

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

    if (!host.endsWith(".github.io")) {

        throw new Error(
            "This automatic folder scanner is designed for GitHub Pages."
        );

    }

    const username = host.split(".")[0];

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

    let name = filename.replace(/\.nes$/i, "");

    name = name.replace(/_/g, " ");

    name = name.toUpperCase();

    return name;
}


/* =========================================
   FIND ALL NES FILES
========================================= */

async function findGames() {

    const repo = getRepositoryInfo();

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


    /* -------------------------
       GAME IMAGE
    ------------------------- */

    const imageName =
        game.name.replace(/\.nes$/i, ".png");

    const image = document.createElement("img");

    image.src =
        `${IMAGE_FOLDER}/${imageName}`;

    image.alt = name;

    image.onerror = function () {

        image.style.display = "none";

    };


    /* -------------------------
       GAME NAME
    ------------------------- */

    const title = document.createElement("div");

    title.className = "game-name";

    title.textContent = name;


    /* -------------------------
       BUILD CARD
    ------------------------- */

    card.appendChild(image);
    card.appendChild(title);


    /* -------------------------
       START GAME
    ------------------------- */

    card.addEventListener("click", function () {

        startGame(game.download_url, name);

    });


    return card;
}


/* =========================================
   START A GAME
========================================= */

async function startGame(romURL, name) {

    /* Switch to game screen */

    gameListScreen.style.display = "none";

    gameScreen.style.display = "block";

    gameTitle.textContent = name;

    gameLoading.style.display = "block";

    gameLoading.textContent = "Loading game...";


    /* Remove previous emulator */

    nesContainer.innerHTML = "";


    try {

        console.log("Loading:", romURL);


        /* -------------------------
           DOWNLOAD ROM
        ------------------------- */

        const response = await fetch(romURL);

        if (!response.ok) {

            throw new Error(
                `Could not download ROM. HTTP ${response.status}`
            );

        }


        /* -------------------------
           CONVERT ROM
        ------------------------- */

        const buffer = await response.arrayBuffer();

        const romBytes = new Uint8Array(buffer);

        let romBinaryString = "";

        for (let i = 0; i < romBytes.length; i++) {

            romBinaryString += String.fromCharCode(
                romBytes[i]
            );

        }


        /* -------------------------
           START JSNES
        ------------------------- */

        window.nesBrowserPlayer = new jsnes.Browser({

            container: nesContainer,

            romData: romBinaryString

        });


        /* Game loaded */

        gameLoading.style.display = "none";

        console.log(
            `${name} successfully loaded.`
        );


        /* -------------------------
           TRY FULLSCREEN
        ------------------------- */

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


        gameLoading.style.display = "block";

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


    /* Leave fullscreen */

    if (document.fullscreenElement) {

        document.exitFullscreen().catch(() => {});

    }


    /* Remove emulator */

    nesContainer.innerHTML = "";


    /* Return to game list */

    gameScreen.style.display = "none";

    gameListScreen.style.display = "block";

    gameTitle.textContent = "";


    /* Reset loading text */

    gameLoading.style.display = "block";

    gameLoading.textContent = "Loading game...";

});


/* =========================================
   LOAD GAME LIST
========================================= */

async function loadGameList() {

    try {

        const games = await findGames();


        /* Remove loading message */

        gameList.innerHTML = "";


        /* No games found */

        if (games.length === 0) {

            gameList.innerHTML =
                `<p>No .nes files were found in the "${ROM_FOLDER}" folder.</p>`;

            return;

        }


        /* Create a card for every game */

        for (const game of games) {

            const card =
                createGameCard(game);

            gameList.appendChild(card);

        }


        console.log(
            `Found ${games.length} NES games.`
        );

    } catch (error) {

        console.error(error);


        gameList.innerHTML =
            `<p>
                Could not load the game list.<br><br>
                ${error.message}
            </p>`;

    }

}


/* =========================================
   START
========================================= */

loadGameList();
