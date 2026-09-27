/*
 * AUTOMATIC NES GAME LIBRARY
 *
 * Looks through the /games folder on GitHub,
 * finds every .nes file, and creates the game list.
 *
 * Features:
 * - Automatic game discovery
 * - Game search
 * - Optional game artwork
 * - NES emulator
 * - Back button
 * - Proper emulator cleanup
 */


/* =========================================
   SETTINGS
========================================= */

const ROM_FOLDER = "games";

const IMAGE_FOLDER = "images";


/* =========================================
   PAGE ELEMENTS
========================================= */

const gameListScreen =
    document.getElementById("game-list-screen");

const gameList =
    document.getElementById("game-list");

const gameSearch =
    document.getElementById("game-search");

const gameScreen =
    document.getElementById("game-screen");

const nesContainer =
    document.getElementById("nes-container");

const backButton =
    document.getElementById("back-button");

const gameTitle =
    document.getElementById("game-title");

const gameLoading =
    document.getElementById("game-loading");


/* =========================================
   CURRENT EMULATOR
========================================= */

let nesBrowserPlayer = null;


/* =========================================
   ALL GAMES
========================================= */

let allGames = [];


/* =========================================
   GET GITHUB REPOSITORY
========================================= */

function getRepositoryInfo() {

    const host =
        window.location.hostname;


    if (!host.endsWith(".github.io")) {

        throw new Error(
            "This automatic folder scanner is designed for GitHub Pages."
        );

    }


    const username =
        host.split(".")[0];


    const pathParts =
        window.location.pathname
            .split("/")
            .filter(part => part.length > 0);


    let repository;


    if (pathParts.length > 0) {

        repository =
            pathParts[0];

    } else {

        repository =
            username + ".github.io";

    }


    return {
        username: username,
        repository: repository
    };

}


/* =========================================
   MAKE GAME NAME
========================================= */

function makeGameName(filename) {

    /*
     * Remove .nes
     */

    let name =
        filename.replace(/\.nes$/i, "");


    /*
     * Replace underscores
     */

    name =
        name.replace(/_/g, " ");


    /*
     * Uppercase
     */

    name =
        name.toUpperCase();


    return name;

}


/* =========================================
   FIND GAMES
========================================= */

async function findGames() {

    const repo =
        getRepositoryInfo();


    const apiURL =
        `https://api.github.com/repos/${repo.username}/${repo.repository}/contents/${ROM_FOLDER}`;


    const response =
        await fetch(apiURL);


    if (!response.ok) {

        throw new Error(
            `Could not read the "${ROM_FOLDER}" folder. ` +
            `GitHub returned status ${response.status}.`
        );

    }


    const files =
        await response.json();


    const games =
        files
            .filter(file =>
                file.type === "file" &&
                file.name
                    .toLowerCase()
                    .endsWith(".nes")
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

    const card =
        document.createElement("div");


    card.className =
        "game-card";


    const name =
        makeGameName(game.name);


    /* =====================================
       IMAGE
    ====================================== */

    const imageName =
        game.name.replace(
            /\.nes$/i,
            ".png"
        );


    const image =
        document.createElement("img");


    image.src =
        `${IMAGE_FOLDER}/${imageName}`;


    image.alt =
        name;


    /*
     * Hide image if it doesn't exist.
     */

    image.onerror =
        function () {

            image.style.display =
                "none";

        };


    /* =====================================
       NAME
    ====================================== */

    const title =
        document.createElement("div");


    title.className =
        "game-name";


    title.textContent =
        name;


    /* =====================================
       BUILD CARD
    ====================================== */

    card.appendChild(image);

    card.appendChild(title);


    /* =====================================
       CLICK
    ====================================== */

    card.addEventListener(
        "click",
        function () {

            startGame(
                game.download_url,
                name
            );

        }
    );


    return card;

}


/* =========================================
   DISPLAY GAMES
========================================= */

function displayGames(games) {

    /*
     * Clear current cards.
     */

    gameList.innerHTML = "";


    /*
     * No results.
     */

    if (games.length === 0) {

        const message =
            document.createElement("p");


        message.id =
            "no-search-results";


        message.textContent =
            "No games found.";


        gameList.appendChild(message);


        return;

    }


    /*
     * Create cards.
     */

    for (const game of games) {

        const card =
            createGameCard(game);


        gameList.appendChild(card);

    }

}


/* =========================================
   SEARCH GAMES
========================================= */

gameSearch.addEventListener(
    "input",
    function () {

        const searchText =
            gameSearch.value
                .trim()
                .toUpperCase();


        /*
         * Filter the complete game list.
         */

        const filteredGames =
            allGames.filter(game => {

                const name =
                    makeGameName(
                        game.name
                    );


                return name.includes(
                    searchText
                );

            });


        displayGames(
            filteredGames
        );

    }
);


/* =========================================
   STOP GAME
========================================= */

function stopGame() {

    /*
     * If an emulator exists,
     * try to destroy it.
     */

    if (nesBrowserPlayer) {

        try {

            if (
                typeof nesBrowserPlayer.destroy ===
                "function"
            ) {

                nesBrowserPlayer.destroy();

            }

        } catch (error) {

            console.log(
                "Could not destroy emulator:",
                error
            );

        }


        nesBrowserPlayer =
            null;

    }


    /*
     * Completely remove the
     * emulator canvas.
     */

    nesContainer.innerHTML =
        "";

}


/* =========================================
   START GAME
========================================= */

async function startGame(
    romURL,
    name
) {

    /*
     * Stop any existing emulator.
     */

    stopGame();


    /*
     * Switch screens.
     */

    gameListScreen.style.display =
        "none";

    gameScreen.style.display =
        "block";


    /*
     * Set title.
     */

    gameTitle.textContent =
        name;


    /*
     * Show loading.
     */

    gameLoading.style.display =
        "block";

    gameLoading.textContent =
        "Loading game...";


    try {

        console.log(
            "Loading:",
            romURL
        );


        /* =================================
           DOWNLOAD ROM
        ================================== */

        const response =
            await fetch(romURL);


        if (!response.ok) {

            throw new Error(
                `Could not download ROM. HTTP ${response.status}`
            );

        }


        /* =================================
           CONVERT ROM
        ================================== */

        const buffer =
            await response.arrayBuffer();


        const romBytes =
            new Uint8Array(buffer);


        let romBinaryString =
            "";


        for (
            let i = 0;
            i < romBytes.length;
            i++
        ) {

            romBinaryString +=
                String.fromCharCode(
                    romBytes[i]
                );

        }


        /* =================================
           START JSNES
        ================================== */

        nesBrowserPlayer =
            new jsnes.Browser({

                container:
                    nesContainer,

                romData:
                    romBinaryString

            });


        /* =================================
           FINISHED
        ================================== */

        gameLoading.style.display =
            "none";


        console.log(
            `${name} successfully loaded.`
        );


        /*
         * Make sure the user starts
         * at the top of the game page.
         *
         * NO automatic fullscreen.
         */

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Emulator Boot Failure:",
            error
        );


        gameLoading.style.display =
            "block";


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

backButton.addEventListener(
    "click",
    function () {

        /*
         * Stop emulator.
         */

        stopGame();


        /*
         * Return to game list.
         */

        gameScreen.style.display =
            "none";

        gameListScreen.style.display =
            "block";


        /*
         * Clear game title.
         */

        gameTitle.textContent =
            "";


        /*
         * Reset loading message.
         */

        gameLoading.style.display =
            "block";

        gameLoading.textContent =
            "Loading game...";


        /*
         * Clear search.
         *
         * Remove these three lines if you
         * want the search to remain active
         * after returning.
         */

        gameSearch.value =
            "";


        displayGames(
            allGames
        );


        /*
         * Go to top of library.
         */

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


/* =========================================
   LOAD GAME LIST
========================================= */

async function loadGameList() {

    try {

        /*
         * Find all games.
         */

        allGames =
            await findGames();


        /*
         * Display them.
         */

        displayGames(
            allGames
        );


        console.log(
            `Found ${allGames.length} NES games.`
        );


    } catch (error) {

        console.error(
            error
        );


        gameList.innerHTML =
            `<p>
                Could not load the game list.
                <br><br>
                ${error.message}
            </p>`;

    }

}


/* =========================================
   START
========================================= */

loadGameList();
