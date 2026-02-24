export const WORD_LISTS: Record<string, string[]> = {
  animals: [
    "Elephant", "Dog", "Cat", "Giraffe", "Penguin", "Dolphin", "Butterfly", "Snake", "Rabbit", "Owl",
    "Lion", "Tiger", "Bear", "Monkey", "Zebra", "Kangaroo", "Whale", "Shark", "Eagle", "Frog",
    "Horse", "Cow", "Pig", "Chicken", "Duck", "Turtle", "Octopus", "Jellyfish", "Flamingo", "Parrot",
    "Wolf", "Fox", "Deer", "Moose", "Bat", "Bee", "Ant", "Spider", "Crocodile", "Hippo",
    "Peacock", "Gorilla", "Panda", "Koala", "Sloth", "Chameleon", "Seahorse", "Starfish", "Crab", "Lobster",
    "Snail", "Hedgehog", "Squirrel", "Raccoon", "Skunk", "Camel", "Llama", "Ostrich", "Pelican", "Swan",
  ],
  objects: [
    "Rocket", "House", "Car", "Umbrella", "Guitar", "Camera", "Bicycle", "Clock", "Telescope", "Crown",
    "Airplane", "Helicopter", "Train", "Boat", "Submarine", "Skateboard", "Motorcycle", "Bus", "Truck", "Tractor",
    "Piano", "Drum", "Violin", "Trumpet", "Microphone", "Headphones", "Television", "Computer", "Phone", "Lamp",
    "Chair", "Table", "Bed", "Sofa", "Bookshelf", "Mirror", "Scissors", "Hammer", "Wrench", "Key",
    "Ladder", "Tent", "Backpack", "Suitcase", "Wallet", "Glasses", "Hat", "Shoe", "Ring", "Necklace",
    "Candle", "Lighthouse", "Windmill", "Bridge", "Castle", "Sword", "Shield", "Treasure Chest", "Globe", "Map",
    "Paintbrush", "Pencil", "Notebook", "Envelope", "Mailbox", "Kite", "Balloon", "Firework", "Magnet", "Compass",
  ],
  food: [
    "Pizza", "Banana", "Hamburger", "Ice Cream", "Sushi", "Taco", "Donut", "Watermelon", "Cupcake", "Popcorn",
    "Apple", "Orange", "Grapes", "Strawberry", "Pineapple", "Cherry", "Lemon", "Avocado", "Carrot", "Broccoli",
    "Corn", "Mushroom", "Onion", "Potato", "Tomato", "Pepper", "Cheese", "Bread", "Croissant", "Pretzel",
    "Pancake", "Waffle", "Cookie", "Cake", "Pie", "Chocolate", "Candy", "Lollipop", "Gummy Bear", "Cotton Candy",
    "Hot Dog", "French Fries", "Burrito", "Sandwich", "Fried Egg", "Bacon", "Steak", "Chicken Leg", "Shrimp", "Noodles",
    "Coffee", "Milkshake", "Juice Box", "Coconut", "Mango", "Pear", "Peach", "Pumpkin", "Eggplant", "Garlic",
  ],
  places: [
    "Beach", "Mountain", "Forest", "Desert", "Island", "Volcano", "Waterfall", "Cave", "Lake", "River",
    "Hospital", "School", "Library", "Museum", "Zoo", "Circus", "Playground", "Stadium", "Airport", "Train Station",
    "Restaurant", "Bakery", "Supermarket", "Farm", "Garden", "Park", "Swimming Pool", "Movie Theater", "Church", "Prison",
  ],
  actions: [
    "Swimming", "Dancing", "Cooking", "Sleeping", "Running", "Jumping", "Climbing", "Fishing", "Surfing", "Skiing",
    "Reading", "Painting", "Singing", "Laughing", "Crying", "Sneezing", "Yawning", "Waving", "Clapping", "Hugging",
    "Digging", "Flying", "Diving", "Bowling", "Boxing", "Juggling", "Camping", "Hiking", "Karate", "Yoga",
  ],
  all: [],
};

// "all" is a merged list
WORD_LISTS.all = [
  ...WORD_LISTS.animals,
  ...WORD_LISTS.objects,
  ...WORD_LISTS.food,
  ...WORD_LISTS.places,
  ...WORD_LISTS.actions,
];

export function getRandomWord(category: string = "all"): string {
  const list = WORD_LISTS[category] || WORD_LISTS.all;
  return list[Math.floor(Math.random() * list.length)];
}

export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
