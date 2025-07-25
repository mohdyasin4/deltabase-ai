/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript:{
    ignoreBuildErrors: true,
  }, 
  eslint:{
    ignoreDuringBuilds:true,
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'images.unsplash.com',
      port: '',
      pathname: '/**'
    }, {
      protocol: 'https',
      hostname: 'seo-heist.s3.amazonaws.com',
      port: '',
      pathname: '/**'
    }, {
      protocol: 'https',
      hostname: 'github.com',
      port: '',
      pathname: '/**'
    }, {
      protocol: 'https',
      hostname: 'ansubkhan.com',
      port: '',
      pathname: '/**'
    }, {
      protocol: 'https',
      hostname: 'utfs.io',
      port: '',
      pathname: '/**'
    },
    {
      protocol: 'https',
      hostname: 'cdn.dribbble.com',
      port: '',
      pathname: '/**'
    }]
  }
};
module.exports = nextConfig;