# Development

To setup the dev environment, install dependencies on your local machine:

- [Node.js](https://nodejs.org)
- [Bun](https://bun.sh)

You shouldn't be required to use Bun, and you can replace all `bun` commands with `npm`, but this will be slower.

Install modules with the following command:

```
bun install
```

Then, you can run the development server with the following:

```
bun run dev
```

# Building

To build the website, run the following:

```
bun run build
```

This will go through the process of building the website with [Vite](https://vite.dev/).

# Deploying

This website is deployed by [Cloudflare Pages](https://pages.cloudflare.com/).

Set framework to none and use Vite's [build instructions](https://vite.dev/guide/static-deploy.html).

# Credits

Icons are courtesy of [Bootstrap Icons](https://icons.getbootstrap.com/).
