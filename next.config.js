/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'pbs.twimg.com', // Twitter profile images
      'cdn-images-1.medium.com', // Medium article images
      'miro.medium.com', // Medium article images
      'images.unsplash.com', // Unsplash images (if used)
    ],
  },
}

module.exports = nextConfig