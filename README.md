# Development
To setup the dev environment, install dependencies:
- [Node.js](https://nodejs.org)
- [Bun](https://bun.sh)

You should also be able to use `npm` instead of `bun` it will just be slower.

# Building
To build the website, run the following:
```
bun run build
```
This will go through the process of building the website with [Vite](https://vitejs.dev/guide/static-deploy.html).

# Deploying
This website is deployed by [Cloudflare Pages](https://pages.cloudflare.com/).

Set framework to none and use the build instructions from up top.
