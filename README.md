# W3-Energy - Real World Assets DeFi Platform

A modern, responsive DeFi platform for trading, staking, and investing in
tokenized real-world assets including renewable energy projects, carbon credits,
and green bonds.

## 🌟 Features

- **Multi-Chain Support**: Ethereum, Polygon, Arbitrum, and Base
- **Asset Tokenization**: Solar, Wind, Hydrogen, Battery Storage, and more
- **DeFi Integration**: Trading, staking, yield farming, and liquidity mining
- **Theme System**: Light, Dark, and Green themes
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Real-time Data**: Live pricing, APY calculations, and market metrics
- **Portfolio Management**: Track investments and rewards
- **ESG Impact**: Environmental and social governance metrics

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd rwa-defi-platform
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
rwa-defi-platform/
├── app/                    # Next.js 14 App Router
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── cards/        # Card components (TokenCard, etc.)
│   │   ├── layout/       # Layout components (Sidebar, etc.)
│   │   ├── ui/           # Base UI components (Button, Card)
│   │   ├── index.ts      # Component exports
│   │   └── rwa-defi-platform.tsx # Main platform component
│   ├── lib/              # Utility functions and configurations
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── public/               # Static assets
├── scripts/              # Deployment and utility scripts
└── Configuration files...
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useMemo, useEffect)
- **Build Tool**: Next.js built-in bundler
- **Linting**: ESLint with Next.js configuration

## 🎨 Themes

The platform supports three built-in themes:

- **Light Mode**: Clean, professional appearance
- **Dark Mode**: Reduced eye strain for extended use
- **Green Mode**: Eco-friendly theme matching the RWA focus

## 📱 Responsive Design

- **Mobile**: Collapsible sidebar, touch-friendly interactions
- **Tablet**: Optimized grid layouts and navigation
- **Desktop**: Full sidebar, multi-column layouts

## 🔧 Configuration

### Tailwind CSS

The project uses a custom Tailwind configuration with:

- Extended color palette for primary/secondary themes
- Custom animations and keyframes
- Form plugin integration
- Dark mode support

### TypeScript

Configured with strict mode and path aliases:

- `@/*` → `./src/*`
- `@/components/*` → `./src/components/*`
- `@/lib/*` → `./src/lib/*`

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically with zero configuration

### Other Platforms

The project can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

### Adding New Features

1. **Components**: Add to `src/components/`
2. **Types**: Define in `src/types/`
3. **Utilities**: Add to `src/lib/utils.ts`
4. **Styles**: Use Tailwind classes or extend in `globals.css`

## 🎯 Roadmap

- [ ] Web3 wallet integration (MetaMask, WalletConnect)
- [ ] Real blockchain integration
- [ ] Advanced charting and analytics
- [ ] User authentication and profiles
- [ ] Real-time price feeds
- [ ] Mobile app (React Native)
- [ ] Advanced DeFi features (lending, borrowing)
- [ ] DAO governance integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🙏 Acknowledgments

- [Lucide React](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Next.js](https://nextjs.org/) for the amazing React framework
- The DeFi and RWA communities for inspiration

## 📞 Support

For support, email whitelist@w3-energy.org or join our Discord community.

---

Built with ❤️ for the future of sustainable finance.
