# Development

1. Clone the Git repository

```bash
git clone https://github.com/noahcroghan/personal-website.git
```

2. Create a file in the project root named `.dev.vars`, and paste in your [Last.fm API Key](https://www.last.fm/api/accounts)

```env
LASTFM_API_KEY=your_actual_key_here
```

3. Install dependencies on your local machine:

- [Node.js](https://nodejs.org)[^1]

4. Install modules with the following command:

```bash
npm install
```

5. Finally, you can run the development server with the following:

```bash
npm run dev
```

# Building

To build the website, run the following:

```bash
npm run build
```

This will go through the process of building the website with [Vite](https://vite.dev/).

# Deploying

- This website is deployed by [Cloudflare Pages](https://pages.cloudflare.com/).
  - The website uses a secret key in your dashboard for Last.fm connection.
- Set framework to none and use Vite's [build instructions](https://vite.dev/guide/static-deploy.html).

# Credits

Icons are courtesy of [Bootstrap Icons](https://icons.getbootstrap.com/).

[^1]: You can use [Bun](https://bun.com/) as a drop-in replacement for `npm`, which is much faster.
