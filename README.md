# Confluence to Markdown Converter UI

A modern web application for converting Confluence HTML content to Markdown format. Built with React and TypeScript, this tool provides a user-friendly interface for converting Confluence content while maintaining formatting and structure.

## Features

- Real-time HTML to Markdown conversion
- Live preview of both HTML and Markdown content
- Customizable conversion options:
  - Panel style (blockquote, div, section)
  - Table style (GitHub, simple, HTML)
  - Code block style (fenced, indented)
  - Image style (markdown, HTML)
  - Macro handling options
- Dark/Light theme support
- File upload support for HTML content
- Responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd confluence-converter-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production build:

```bash
npm run build
```

The build output will be in the `build` directory.

## Usage

1. Enter HTML content in the left panel or upload an HTML file
2. Use the preview toggle to switch between code and preview views
3. Adjust conversion options in the sidebar
4. View the converted Markdown in the right panel
5. Copy the Markdown output for use in your documentation

## Conversion Options

### Panel Style
- **Blockquote**: Converts panels to Markdown blockquotes
- **Div**: Preserves panels as HTML div elements
- **Section**: Converts panels to Markdown sections

### Table Style
- **GitHub**: Uses GitHub-flavored Markdown tables
- **Simple**: Simplified table format
- **HTML**: Preserves tables as HTML

### Code Block Style
- **Fenced**: Uses triple backticks for code blocks
- **Indented**: Uses indentation for code blocks

### Image Style
- **Markdown**: Converts images to Markdown syntax
- **HTML**: Preserves images as HTML

### Macro Handling
Customize how different Confluence macros are converted:
- Info macros
- Warning macros
- Note macros
- Code macros

## Development

### Project Structure

```
confluence-converter-ui/
├── src/
│   ├── components/     # React components
│   ├── utils/         # Utility functions and converters
│   ├── App.tsx        # Main application component
│   └── index.tsx      # Application entry point
├── public/            # Static assets
└── package.json       # Project dependencies and scripts
```

### Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
