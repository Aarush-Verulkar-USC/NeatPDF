# NeatPDF ✨

A free, privacy-focused PDF toolkit built with React. Merge, split, reorder, and edit PDF files entirely in your browser - no uploads, no servers, just pure client-side magic.

![NeatPDF](https://img.shields.io/badge/PDF-Toolkit-B8CFCE?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## 🚀 Features

### 📄 Merge PDFs
- Combine multiple PDF files into a single document
- Drag and drop interface
- Preserve original quality
- Instant processing

### ✂️ Split & Edit PDFs
- Visual page grid with thumbnails
- **Drag & drop reordering** with smooth animations
- **Select individual pages** or page ranges
- **Delete unwanted pages**
- Download options:
  - Individual pages as separate PDFs
  - Selected pages as one combined PDF
  - All pages (after reordering) as one PDF

### 🔒 Privacy First
- **100% client-side processing** - your files never leave your browser
- No uploads to any server
- No tracking, no data collection
- Works completely offline after initial load

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS 3** - Styling with custom color scheme
- **pdf-lib** - PDF manipulation
- **pdfjs-dist** - PDF rendering and thumbnails
- **Heroicons** - Beautiful UI icons
- **OGL** - WebGL-based animated background
- **Figtree Font** - Clean, modern typography

## 🎨 Design

NeatPDF features a beautiful, minimal design with a custom color palette:
- Background: `#333446` (Dark slate)
- Mid-tone: `#7F8CAA` (Muted blue-gray)
- Accent: `#B8CFCE` (Soft teal)
- Light: `#EAEFEF` (Off-white)

Includes an animated WebGL background with interactive threads that respond to mouse movement.

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/neatpdf.git
cd neatpdf

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Project Structure

```
neatpdf/
├── src/
│   ├── App.jsx           # Main application component
│   ├── Threads.jsx       # Animated WebGL background
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind CSS imports
├── public/
│   └── pdf.worker.min.js # PDF.js worker (copied during build)
├── dist/                 # Production build output
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
└── package.json          # Dependencies and scripts
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Acknowledgments

- Made with ❤️ by [Aarush](https://github.com/aarush-verulkar-usc)
- Animated background inspired by [ReactBits Threads](https://reactbits.dev)
- Icons by [Heroicons](https://heroicons.com)
- Font: [Figtree](https://fonts.google.com/specimen/Figtree) by Google Fonts

## 🌟 Show Your Support

If you found NeatPDF helpful, please consider giving it a ⭐️ on GitHub!

---

**[Live Demo](https://your-neatpdf-url.netlify.app)** • **[Report Bug](https://github.com/yourusername/neatpdf/issues)** • **[Request Feature](https://github.com/yourusername/neatpdf/issues)**
