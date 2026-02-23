export const WORD_LISTS: Record<string, string[]> = {
  animals: ["Elephant", "Dog", "Cat", "Giraffe", "Penguin", "Dolphin", "Butterfly", "Snake", "Rabbit", "Owl"],
  objects: ["Rocket", "House", "Car", "Umbrella", "Guitar", "Camera", "Bicycle", "Clock", "Telescope", "Crown"],
  food: ["Pizza", "Banana", "Hamburger", "Ice Cream", "Sushi", "Taco", "Donut", "Watermelon", "Cupcake", "Popcorn"],
  all: [],
};

// "all" is a merged list
WORD_LISTS.all = [...WORD_LISTS.animals, ...WORD_LISTS.objects, ...WORD_LISTS.food];

export function getRandomWord(category: string = "all"): string {
  const list = WORD_LISTS[category] || WORD_LISTS.all;
  return list[Math.floor(Math.random() * list.length)];
}

export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
