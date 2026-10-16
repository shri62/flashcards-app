
"use strict";

// ========================================
// 1. HTML ELEMENTS
// ========================================

const deckSearch = document.getElementById("deck-search");
const deckList = document.getElementById("deck-list");

const newDeckButton = document.getElementById("new-deck-button");
const editDeckButton = document.getElementById("edit-deck-button");
const deleteDeckButton = document.getElementById("delete-deck-button");

const studyHeading = document.getElementById("study-heading");
const searchInput = document.getElementById("search-input");
const matchCount = document.getElementById("match-count");

const flashcard = document.querySelector(".flashcard");
const flashcardFront = document.querySelector(".flashcard-front");
const flashcardBack = document.querySelector(".flashcard-back");

const questionHeading = flashcardFront.querySelector("h3");
const questionText = flashcardFront.querySelector("p");
const answerHeading = flashcardBack.querySelector("h3");
const answerText = flashcardBack.querySelector("p");

const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const flipButton = document.getElementById("flip-button");
const shuffleButton = document.getElementById("shuffle-button");

const newCardButton = document.getElementById("new-card-button");
const editCardButton = document.getElementById("edit-card-button");
const deleteCardButton = document.getElementById("delete-card-button");

const newDeckModal = document.getElementById("new-deck-modal");
const newDeckForm = document.getElementById("new-deck-form");
const newDeckName = document.getElementById("new-deck-name");
const deckError = document.getElementById("deck-error");
const cancelDeckButton = document.getElementById("cancel-deck-button");

// ========================================
// 2. APPLICATION STATE
// ========================================

const STORAGE_KEY = "flashcard-study-app-state-v1";
const LEGACY_STORAGE_KEY = "flashcard-study-app-decks";

let decks = [];
let selectedDeckId = null;
let currentCardIndex = 0;
let isFlipped = false;
let searchTimeout;

// ========================================
// 3. CREATE UNIQUE IDS
// ========================================

function makeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// ========================================
// 4. LOAD AND SAVE DATA
// ========================================

function loadState() {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);

        if (savedState) {
            const parsedState = JSON.parse(savedState);

            if (
                parsedState &&
                parsedState.version === 1 &&
                Array.isArray(parsedState.decks)
            ) {
                return parsedState;
            }
        }

        // Support data saved by the previous app version.
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);

        if (legacyData) {
            const oldDecks = JSON.parse(legacyData);

            if (Array.isArray(oldDecks)) {
                return {
                    version: 1,
                    decks: oldDecks,
                    selectedDeckId: oldDecks[0]?.id ?? null
                };
            }
        }
    } catch (error) {
        console.error("Could not load saved flashcards:", error);
    }

    return {
        version: 1,
        decks: [],
        selectedDeckId: null
    };
}

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: 1,
                decks: decks,
                selectedDeckId: selectedDeckId
            })
        );
    } catch (error) {
        console.error("Could not save flashcards:", error);
        alert("Your changes could not be saved in this browser.");
    }
}

// Keep the existing function name used throughout the app.
function saveDecks() {
    saveState();
}

// Restore saved data.
const savedState = loadState();
decks = savedState.decks;

if (decks.length > 0) {
    const savedDeckExists = decks.some(function (deck) {
        return deck.id === savedState.selectedDeckId;
    });

    selectedDeckId = savedDeckExists
        ? savedState.selectedDeckId
        : decks[0].id;
}

saveState();

// ========================================
// 5. GET DECKS AND CARDS
// ========================================

function getSelectedDeck() {
    return decks.find(function (deck) {
        return deck.id === selectedDeckId;
    }) || null;
}

function getCurrentCard() {
    const deck = getSelectedDeck();

    if (!deck || deck.cards.length === 0) {
        return null;
    }

    if (currentCardIndex >= deck.cards.length) {
        currentCardIndex = 0;
    }

    return deck.cards[currentCardIndex];
}

// ========================================
// 6. SEARCH FLASHCARDS
// ========================================

function getMatchingCards() {
    const deck = getSelectedDeck();

    if (!deck) {
        return [];
    }

    const keyword = searchInput.value.trim().toLowerCase();

    return deck.cards
        .map(function (card, index) {
            return {
                card: card,
                originalIndex: index
            };
        })
        .filter(function (item) {
            if (keyword === "") {
                return true;
            }

            return (
                item.card.question.toLowerCase().includes(keyword) ||
                item.card.answer.toLowerCase().includes(keyword)
            );
        });
}

function handleCardSearch() {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(function () {
        renderStudyArea();
    }, 300);
}

// ========================================
// 7. RENDER THE DECK LIST
// ========================================

function renderDeckList() {
    const keyword = deckSearch.value.trim().toLowerCase();

    deckList.replaceChildren();

    const matchingDecks = decks.filter(function (deck) {
        return deck.name.toLowerCase().includes(keyword);
    });

    if (matchingDecks.length === 0) {
        const emptyItem = document.createElement("li");
        const emptyMessage = document.createElement("p");

        emptyMessage.textContent = decks.length === 0
            ? "No decks yet. Select New Deck to create your first deck."
            : "No decks found. Try another search term.";

        emptyItem.appendChild(emptyMessage);
        deckList.appendChild(emptyItem);
        return;
    }

    matchingDecks.forEach(function (deck) {
        const listItem = document.createElement("li");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "deck-item";
        button.textContent =
            deck.name + " (" + deck.cards.length + ")";

        button.setAttribute(
            "aria-pressed",
            String(deck.id === selectedDeckId)
        );

        if (deck.id === selectedDeckId) {
            button.classList.add("active");
        }

        button.addEventListener("click", function () {
            selectedDeckId = deck.id;
            currentCardIndex = 0;
            isFlipped = false;

            searchInput.value = "";
            saveDecks();
            render();
        });

        listItem.appendChild(button);
        deckList.appendChild(listItem);
    });
}

// ========================================
// 8. RENDER THE STUDY AREA
// ========================================

function renderStudyArea() {
    const deck = getSelectedDeck();
    const matches = getMatchingCards();

    let currentMatch = matches.find(function (item) {
        return item.originalIndex === currentCardIndex;
    });

    // Select the first result if the current card does not match.
    if (!currentMatch && matches.length > 0) {
        currentCardIndex = matches[0].originalIndex;
        currentMatch = matches[0];
        isFlipped = false;
    }

    const card = currentMatch ? currentMatch.card : null;

    if (searchInput.value.trim() === "") {
        matchCount.textContent = deck && deck.cards.length > 0
            ? "Showing all " + deck.cards.length + " cards"
            : "Showing all cards";
    } else {
        matchCount.textContent =
            matches.length +
            (matches.length === 1
                ? " matching card"
                : " matching cards");
    }

    if (!deck) {
        studyHeading.textContent = "No deck selected";
        questionHeading.textContent = "Ready to study?";
        questionText.textContent =
            "Create a deck to get started.";
        answerHeading.textContent = "Answer";
        answerText.textContent = "";
    } else if (matches.length === 0 && deck.cards.length > 0) {
        studyHeading.textContent = "Study: " + deck.name;
        questionHeading.textContent = "No cards found";
        questionText.textContent =
            "Try another keyword or clear the search to see all cards.";
        answerHeading.textContent = "Answer";
        answerText.textContent = "";
    } else if (!card) {
        studyHeading.textContent = "Study: " + deck.name;
        questionHeading.textContent = "No cards yet";
        questionText.textContent =
            "Select New Card to add your first flashcard.";
        answerHeading.textContent = "Answer";
        answerText.textContent = "";
    } else {
        studyHeading.textContent = "Study: " + deck.name;
        questionHeading.textContent = "Question";
        questionText.textContent = card.question;
        answerHeading.textContent = "Answer";
        answerText.textContent = card.answer;
    }

    flashcardBack.hidden = !card || !isFlipped;
    flashcard.classList.toggle(
        "is-flipped",
        Boolean(card && isFlipped)
    );

    previousButton.disabled = !deck || matches.length < 2;
    nextButton.disabled = !deck || matches.length < 2;
    flipButton.disabled = !card;
    shuffleButton.disabled = !deck || deck.cards.length < 2;

    editDeckButton.disabled = !deck;
    deleteDeckButton.disabled = !deck;
    newCardButton.disabled = !deck;
    editCardButton.disabled = !card;
    deleteCardButton.disabled = !card;
}

function render() {
    renderDeckList();
    renderStudyArea();
}

// ========================================
// 9. CREATE A NEW DECK
// ========================================

function openNewDeckModal() {
    deckError.textContent = "";
    newDeckName.removeAttribute("aria-invalid");
    newDeckName.value = "";
    newDeckModal.showModal();
    newDeckName.focus();
}

function closeNewDeckModal() {
    newDeckModal.close();
    deckError.textContent = "";
    newDeckName.removeAttribute("aria-invalid");
}

function handleNewDeckSubmit(event) {
    event.preventDefault();

    const name = newDeckName.value.trim();

    if (!name) {
        deckError.textContent = "Please enter a deck name.";
        newDeckName.setAttribute("aria-invalid", "true");
        newDeckName.focus();
        return;
    }

    newDeckName.removeAttribute("aria-invalid");

    const deck = {
        id: makeId(),
        name: name,
        cards: []
    };

    decks.push(deck);
    selectedDeckId = deck.id;
    currentCardIndex = 0;
    isFlipped = false;

    searchInput.value = "";
    deckSearch.value = "";

    saveDecks();
    closeNewDeckModal();
    render();
}

// Clear the invalid state when the user edits the field.
newDeckName.addEventListener("input", function () {
    if (newDeckName.value.trim() !== "") {
        newDeckName.removeAttribute("aria-invalid");
        deckError.textContent = "";
    }
});

// ========================================
// 10. RENAME A DECK
// ========================================

function editDeck() {
    const deck = getSelectedDeck();

    if (!deck) {
        return;
    }

    const newName = prompt("Enter the new deck name:", deck.name);

    if (newName === null) {
        return;
    }

    const trimmedName = newName.trim();

    if (!trimmedName) {
        alert("Deck name cannot be empty.");
        return;
    }

    deck.name = trimmedName;

    saveDecks();
    render();
}

// ========================================
// 11. DELETE A DECK
// ========================================

function deleteDeck() {
    const deck = getSelectedDeck();

    if (!deck) {
        return;
    }

    const confirmed = confirm(
        'Delete the deck "' + deck.name + '" and all its cards?'
    );

    if (!confirmed) {
        return;
    }

    decks = decks.filter(function (item) {
        return item.id !== deck.id;
    });

    selectedDeckId = decks.length > 0 ? decks[0].id : null;
    currentCardIndex = 0;
    isFlipped = false;

    searchInput.value = "";

    saveDecks();
    render();
}

// ========================================
// 12. ADD A FLASHCARD
// ========================================

function addCard() {
    const deck = getSelectedDeck();

    if (!deck) {
        return;
    }

    const question = prompt("Enter the question:");

    if (question === null) {
        return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
        alert("Question cannot be empty.");
        return;
    }

    const answer = prompt("Enter the answer:");

    if (answer === null) {
        return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
        alert("Answer cannot be empty.");
        return;
    }

    deck.cards.push({
        id: makeId(),
        question: trimmedQuestion,
        answer: trimmedAnswer
    });

    currentCardIndex = deck.cards.length - 1;
    isFlipped = false;

    saveDecks();
    render();
}

// ========================================
// 13. EDIT A FLASHCARD
// ========================================

function editCard() {
    const deck = getSelectedDeck();
    const card = getCurrentCard();

    if (!deck || !card) {
        return;
    }

    const question = prompt("Edit the question:", card.question);

    if (question === null) {
        return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
        alert("Question cannot be empty.");
        return;
    }

    const answer = prompt("Edit the answer:", card.answer);

    if (answer === null) {
        return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
        alert("Answer cannot be empty.");
        return;
    }

    card.question = trimmedQuestion;
    card.answer = trimmedAnswer;
    isFlipped = false;

    saveDecks();
    render();
}

// ========================================
// 14. DELETE A FLASHCARD
// ========================================

function deleteCard() {
    const deck = getSelectedDeck();
    const card = getCurrentCard();

    if (!deck || !card) {
        return;
    }

    const confirmed = confirm("Delete this flashcard?");

    if (!confirmed) {
        return;
    }

    deck.cards.splice(currentCardIndex, 1);

    if (currentCardIndex >= deck.cards.length) {
        currentCardIndex = Math.max(0, deck.cards.length - 1);
    }

    isFlipped = false;

    saveDecks();
    render();
}

// ========================================
// 15. PREVIOUS AND NEXT
// ========================================

function nextCard() {
    const matches = getMatchingCards();

    if (matches.length < 2) {
        return;
    }

    const currentMatchIndex = matches.findIndex(function (item) {
        return item.originalIndex === currentCardIndex;
    });

    const safeIndex = currentMatchIndex < 0 ? 0 : currentMatchIndex;
    const nextMatchIndex = (safeIndex + 1) % matches.length;

    currentCardIndex = matches[nextMatchIndex].originalIndex;
    isFlipped = false;

    renderStudyArea();
}

function previousCard() {
    const matches = getMatchingCards();

    if (matches.length < 2) {
        return;
    }

    const currentMatchIndex = matches.findIndex(function (item) {
        return item.originalIndex === currentCardIndex;
    });

    const safeIndex = currentMatchIndex < 0 ? 0 : currentMatchIndex;

    const previousMatchIndex =
        (safeIndex - 1 + matches.length) % matches.length;

    currentCardIndex = matches[previousMatchIndex].originalIndex;
    isFlipped = false;

    renderStudyArea();
}

// ========================================
// 16. FLIP THE FLASHCARD
// ========================================

function flipCard() {
    if (!getCurrentCard()) {
        return;
    }

    isFlipped = !isFlipped;
    renderStudyArea();
}

// ========================================
// 17. SHUFFLE FLASHCARDS
// ========================================

function shuffleCards() {
    const deck = getSelectedDeck();

    if (!deck || deck.cards.length < 2) {
        return;
    }

    for (let i = deck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [deck.cards[i], deck.cards[j]] =
            [deck.cards[j], deck.cards[i]];
    }

    currentCardIndex = 0;
    isFlipped = false;

    saveDecks();
    render();
}

// ========================================
// 18. EVENT LISTENERS
// ========================================

newDeckButton.addEventListener("click", openNewDeckModal);
newDeckForm.addEventListener("submit", handleNewDeckSubmit);
cancelDeckButton.addEventListener("click", closeNewDeckModal);

editDeckButton.addEventListener("click", editDeck);
deleteDeckButton.addEventListener("click", deleteDeck);

newCardButton.addEventListener("click", addCard);
editCardButton.addEventListener("click", editCard);
deleteCardButton.addEventListener("click", deleteCard);

previousButton.addEventListener("click", previousCard);
nextButton.addEventListener("click", nextCard);
flipButton.addEventListener("click", flipCard);
shuffleButton.addEventListener("click", shuffleCards);

deckSearch.addEventListener("input", renderDeckList);
searchInput.addEventListener("input", handleCardSearch);

// ========================================
// 19. KEYBOARD SHORTCUTS
// ========================================

document.addEventListener("keydown", function (event) {
    const activeElement = document.activeElement;

    const isTyping = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        activeElement.isContentEditable
    );

    if (newDeckModal.open || isTyping) {
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();
        flipCard();
    } else if (event.key === "ArrowLeft") {
        previousCard();
    } else if (event.key === "ArrowRight") {
        nextCard();
    }
});

// ========================================
// 20. START THE APP
// ========================================

render();
