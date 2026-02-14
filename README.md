# PipPaper

### The Open Source TradeZella Alternative

PipPaper is a comprehensive trade journaling and analysis platform designed to replicate the core functionality of premium tools like TradeZella, but open source and self-hosted.

## Key Features

- **📊 Advanced Dashboard**: Visualize your P&L, Win Rate, and Equity Curve.
- **📝 Trade Journaling**: Detailed trade logs with execution tracking.
- **🤖 AI Trade Coach**: Get instant feedback on your trades using Google Gemini or Anthropic Claude.
- **📥 Tradovate Import**: Seamlessly import your trade history from Tradovate CSVs.
- **🔒 Privacy Focused**: Your data stays local. API keys are stored in your local environment.

## Getting Started

### Prerequisites
- [Deno](https://deno.land/) (v1.40+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DennisRutjes/PipPaper.git
   cd PipPaper
   ```

2. Run the initialization script:
   ```bash
   ./init.sh
   ```
   This will check your environment, create a `.env` file from the example, and start the development server.

3. Configure your AI Coach:
   Open `.env` and add your API key:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

4. Open your browser at `http://localhost:8000`

## Tech Stack

- **Runtime**: Deno
- **Framework**: Fresh
- **Styling**: Tailwind CSS
- **Database**: Deno KV

## Roadmap

- [ ] Dashboard (P&L, Win Rate)
- [ ] Trade Log & Filtering
- [ ] Trade Detail View
- [ ] Tradovate CSV Import
- [ ] AI Coach Integration (Gemini/Claude)

## License

MIT
