# Word Ladder 🎯

An interactive 4-letter word-ladder graph puzzle game built with React 19, Vite, TypeScript, and Tailwind CSS.

## 🚀 How to Play

1. **Objective:** Morph the starting 4-letter word into the goal target word (e.g., `BOAT` ➔ `COOP` or `COLD` ➔ `WARM`) in as few moves as possible.
2. **Rules:**
   - Change exactly **one letter** at each step.
   - Every intermediate word must be a valid 4-letter English word.
   - Letters cannot be anagrammed or rearranged.
3. **Par Score:** The game calculates the optimal theoretical shortest path using a Breadth-First Search (BFS) graph solver. Try to match or beat **Par**!
4. **Word Verifier:** Use the built-in live dictionary verifier tool to check word validity and test single-letter diffs before making a move.

## 🛠️ Tech Stack

- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Motion
- **Icons:** Lucide React
- **Algorithms:** Breadth-First Search (BFS) word graph traversal, shortest path solver, deterministic daily seed PRNG
- **Audio:** Web Audio API synthesizer

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## 🌐 Deploy to GitHub Pages

This repository includes a ready-to-use GitHub Actions workflow in `.github/workflows/deploy.yml`. When you push to the `main` branch, it automatically builds and deploys to GitHub Pages at `https://<your-username>.github.io/word-ladder/`.
