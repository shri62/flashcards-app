"use strict";

const STORAGE_KEY = "flashcard-study-app-decks";

const deckList = document.getElementById("deck-list");
const deckSearch = document.getElementById("deck-search");
const searchForm = document.querySelector('form[role="search"]');
const studyHeading = document.getElementById("study-heading");
const questionHeading = document.querySelector(".flashcard-front h3");
const questionText = document.querySelector(".flashcard-front p");
const answerText = document.querySelector(".flashcard-back p");
const flashcardBack = document.querySelector(".flashcard-back");

const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const flipButton = document.getElementById("flip-button");
const shuffleButton = document.getElementById("shuffle-button");
const newDeckButton = document.getElementById("new-deck-button");
const editDeckButton = document.getElementById("edit-deck-button");
const deleteDeckButton = document.getElementById("delete-deck-button");
const newCardButton = document.getElementById("new-card-button");
const editCardButton = document.getElementById("edit-card-button");
const deleteCardButton = document.getElementById("delete-card-button");

function makeStarterDeck() {
	return {
		id: "starter-deck",
		name: "Getting Started",
		cards: [
			{
				question: "What does HTML stand for?",
				answer: "HyperText Markup Language"
			}
		]
	};
}

function loadDecks() {
	try {
		const savedDecks = localStorage.getItem(STORAGE_KEY);

		if (savedDecks === null) {
			return [makeStarterDeck()];
		}

		const parsedDecks = JSON.parse(savedDecks);
		const isValid = Array.isArray(parsedDecks) && parsedDecks.every(function (deck) {
			return deck &&
				typeof deck.id === "string" &&
				typeof deck.name === "string" &&
				Array.isArray(deck.cards) &&
				deck.cards.every(function (card) {
					return card &&
						typeof card.question === "string" &&
						typeof card.answer === "string";
				});
		});

		return isValid ? parsedDecks : [makeStarterDeck()];
	} catch (error) {
		return [makeStarterDeck()];
	}
}

let decks = loadDecks();
let selectedDeckId = decks.length > 0 ? decks[0].id : null;
let currentCardIndex = 0;
let isFlipped = false;

function saveDecks() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
	} catch (error) {
		alert("Your changes could not be saved in this browser.");
	}
}

function makeId() {
	return Date.now().toString() + Math.random().toString(16).slice(2);
}

function getSelectedDeck() {
	return decks.find(function (deck) {
		return deck.id === selectedDeckId;
	}) || null;
}

function getCurrentCard() {
	const deck = getSelectedDeck();
	return deck && deck.cards.length > 0 ? deck.cards[currentCardIndex] : null;
}

function renderDeckList() {
	const searchText = deckSearch.value.trim().toLowerCase();
	const matchingDecks = decks.filter(function (deck) {
		return deck.name.toLowerCase().includes(searchText);
	});

	deckList.replaceChildren();

	if (matchingDecks.length === 0) {
		const message = document.createElement("li");
		message.textContent = decks.length === 0
			? "No decks yet. Create one to get started."
			: "No decks match your search.";
		deckList.append(message);
		return;
	}

	matchingDecks.forEach(function (deck) {
		const listItem = document.createElement("li");
		const deckButton = document.createElement("button");

		deckButton.type = "button";
		deckButton.textContent = deck.name;
		deckButton.dataset.deckId = deck.id;
		deckButton.setAttribute("aria-current", deck.id === selectedDeckId ? "true" : "false");
		listItem.append(deckButton);
		deckList.append(listItem);
	});
}

function renderStudyArea() {
	const deck = getSelectedDeck();
	const card = getCurrentCard();

	if (!deck) {
		studyHeading.textContent = "No deck selected";
		questionHeading.textContent = "Ready to study?";
		questionText.textContent = "Create a deck to get started.";
		answerText.textContent = "";
	} else if (!card) {
		studyHeading.textContent = "Study: " + deck.name;
		questionHeading.textContent = "No cards yet";
		questionText.textContent = "Choose New Card to add the first card to this deck.";
		answerText.textContent = "";
	} else {
		studyHeading.textContent = "Study: " + deck.name;
		questionHeading.textContent = "Question";
		questionText.textContent = card.question;
		answerText.textContent = card.answer;
	}

	flashcardBack.hidden = !card || !isFlipped;
	previousButton.disabled = !deck || deck.cards.length < 2;
	nextButton.disabled = !deck || deck.cards.length < 2;
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

function addDeck() {
	const name = prompt("What would you like to name this deck?");
	if (name === null) return;
	if (name.trim() === "") {
		alert("Please enter a deck name.");
		return;
	}

	const deck = { id: makeId(), name: name.trim(), cards: [] };
	decks.push(deck);
	selectedDeckId = deck.id;
	currentCardIndex = 0;
	isFlipped = false;
	deckSearch.value = "";
	saveDecks();
	render();
}

function renameDeck() {
	const deck = getSelectedDeck();
	if (!deck) return;

	const name = prompt("Enter a new name for this deck:", deck.name);
	if (name === null) return;
	if (name.trim() === "") {
		alert("A deck name cannot be empty.");
		return;
	}

	deck.name = name.trim();
	saveDecks();
	render();
}

function deleteDeck() {
	const deck = getSelectedDeck();
	if (!deck) return;
	if (!confirm('Delete the deck "' + deck.name + '" and all its cards?')) return;

	const deletedIndex = decks.findIndex(function (item) {
		return item.id === deck.id;
	});
	decks.splice(deletedIndex, 1);
	selectedDeckId = decks.length > 0 ? decks[Math.min(deletedIndex, decks.length - 1)].id : null;
	currentCardIndex = 0;
	isFlipped = false;
	saveDecks();
	render();
}

function addCard() {
	const deck = getSelectedDeck();
	if (!deck) return;

	const question = prompt("Enter the question:");
	if (question === null) return;
	if (question.trim() === "") {
		alert("Please enter a question.");
		return;
	}

	const answer = prompt("Enter the answer:");
	if (answer === null) return;
	if (answer.trim() === "") {
		alert("Please enter an answer.");
		return;
	}

	deck.cards.push({ question: question.trim(), answer: answer.trim() });
	currentCardIndex = deck.cards.length - 1;
	isFlipped = false;
	saveDecks();
	render();
}

function editCard() {
	const card = getCurrentCard();
	if (!card) return;

	const question = prompt("Edit the question:", card.question);
	if (question === null) return;
	if (question.trim() === "") {
		alert("A question cannot be empty.");
		return;
	}

	const answer = prompt("Edit the answer:", card.answer);
	if (answer === null) return;
	if (answer.trim() === "") {
		alert("An answer cannot be empty.");
		return;
	}

	card.question = question.trim();
	card.answer = answer.trim();
	isFlipped = false;
	saveDecks();
	render();
}

function deleteCard() {
	const deck = getSelectedDeck();
	const card = getCurrentCard();
	if (!deck || !card) return;
	if (!confirm("Delete this flashcard?")) return;

	deck.cards.splice(currentCardIndex, 1);
	currentCardIndex = Math.max(0, currentCardIndex - 1);
	isFlipped = false;
	saveDecks();
	render();
}

newDeckButton.addEventListener("click", addDeck);
editDeckButton.addEventListener("click", renameDeck);
deleteDeckButton.addEventListener("click", deleteDeck);
newCardButton.addEventListener("click", addCard);
editCardButton.addEventListener("click", editCard);
deleteCardButton.addEventListener("click", deleteCard);

deckList.addEventListener("click", function (event) {
	const button = event.target.closest("button[data-deck-id]");
	if (!button) return;

	selectedDeckId = button.dataset.deckId;
	currentCardIndex = 0;
	isFlipped = false;
	render();
});

deckSearch.addEventListener("input", renderDeckList);
searchForm.addEventListener("submit", function (event) {
	event.preventDefault();
	renderDeckList();
});

previousButton.addEventListener("click", function () {
	const deck = getSelectedDeck();
	if (!deck || deck.cards.length < 2) return;
	currentCardIndex = (currentCardIndex - 1 + deck.cards.length) % deck.cards.length;
	isFlipped = false;
	renderStudyArea();
});

nextButton.addEventListener("click", function () {
	const deck = getSelectedDeck();
	if (!deck || deck.cards.length < 2) return;
	currentCardIndex = (currentCardIndex + 1) % deck.cards.length;
	isFlipped = false;
	renderStudyArea();
});

flipButton.addEventListener("click", function () {
	if (!getCurrentCard()) return;
	isFlipped = !isFlipped;
	renderStudyArea();
});

shuffleButton.addEventListener("click", function () {
	const deck = getSelectedDeck();
	if (!deck || deck.cards.length < 2) return;

	for (let index = deck.cards.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		const temporaryCard = deck.cards[index];
		deck.cards[index] = deck.cards[randomIndex];
		deck.cards[randomIndex] = temporaryCard;
	}

	currentCardIndex = 0;
	isFlipped = false;
	saveDecks();
	renderStudyArea();
});

render();
