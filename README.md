# Development
To setup the dev environment, install dependencies:
- [Node.js](https://nodejs.org)
- [Bun](https://bun.sh)

# Building
To build the website, run the following:
```
bun run build
```
This will go through the process of building the website with [Vite](https://vitejs.dev/guide/static-deploy.html).

# Deploying
This website is deployed by [Cloudflare Pages](https://pages.cloudflare.com/)
You will have to use `npm` instead of `bun`, which is fine because Bun is a drop-in replacement for npm
