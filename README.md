This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your keys:

- `ANTHROPIC_API_KEY` - Get your key at [console.anthropic.com](https://console.anthropic.com/)
- `EXA_API_KEY` - Get your key at [exa.ai](https://exa.ai/)

### Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Why Vercel Sandbox?

This project uses the [Claude Agent SDK](https://github.com/anthropics/claude-code) which requires subprocess spawning for multi-agent orchestration. Since Vercel serverless functions don't support subprocesses, we use [Vercel Sandbox](https://vercel.com/docs/functions/sandbox) to run the agent in an isolated container environment.

**Note:** Local development works without Sandbox configuration. These steps are only required for production deployment.

### Setting Up Vercel Sandbox

Follow these steps to configure Vercel Sandbox for production deployment:

#### Step 1: Create a Vercel API Token

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Give it a name (e.g., "dr-agent-sandbox")
4. Set the scope to **Full Access** (required for Sandbox)
5. Copy the token - you won't be able to see it again

#### Step 2: Get Your Project ID

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **General**
3. Scroll down to find **Project ID**
4. Copy the ID (looks like `prj_xxxxxxxxxxxx`)

#### Step 3: Get Your Team ID (if applicable)

If your project is deployed under a **team** (not a personal account):

1. Go to your team settings on Vercel
2. Navigate to **Settings** → **General**
3. Find and copy your **Team ID**

**Note:** If you're using a personal account (not a team), you can skip this step.

#### Step 4: Add Environment Variables in Vercel

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Required |
|----------|-------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | ✅ |
| `EXA_API_KEY` | Your Exa API key | ✅ |
| `VERCEL_TOKEN` | Token from Step 1 | ✅ |
| `VERCEL_PROJECT_ID` | Project ID from Step 2 | ✅ |
| `VERCEL_TEAM_ID` | Team ID from Step 3 | Only if using a team |

4. Make sure each variable is enabled for **Production** (and Preview/Development if needed)
5. Click **Save** for each variable

#### Step 5: Redeploy

After adding the environment variables, trigger a new deployment:

```bash
# If using Vercel CLI
vercel --prod

# Or push a commit to trigger auto-deploy
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Troubleshooting

#### Error: "Status code 403 is not ok"

This means the Sandbox API rejected the request. Check:

1. **Token permissions**: Make sure your `VERCEL_TOKEN` has **Full Access** scope
2. **Team ID missing**: If your project is under a team, `VERCEL_TEAM_ID` is required
3. **Project ID mismatch**: Verify `VERCEL_PROJECT_ID` matches your deployed project
4. **Plan limitations**: Vercel Sandbox may require a Pro or Enterprise plan

#### Error: "VERCEL_TOKEN is required"

The `VERCEL_TOKEN` environment variable is not set. Add it in your Vercel project settings.

#### Error: "VERCEL_PROJECT_ID is required"

The `VERCEL_PROJECT_ID` environment variable is not set. Add it in your Vercel project settings.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              /api/research (API Route)              │   │
│  │                        │                            │   │
│  │                        ▼                            │   │
│  │              Creates Vercel Sandbox ────────────────┼───┼──┐
│  └─────────────────────────────────────────────────────┘   │  │
└─────────────────────────────────────────────────────────────┘  │
                                                                 │
┌─────────────────────────────────────────────────────────────┐  │
│                    Vercel Sandbox                           │◄─┘
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Claude Agent SDK                        │   │
│  │                        │                            │   │
│  │         ┌──────────────┼──────────────┐            │   │
│  │         ▼              ▼              ▼            │   │
│  │    ┌─────────┐   ┌──────────┐   ┌──────────┐      │   │
│  │    │ Planner │   │   Web    │   │  Report  │      │   │
│  │    │  Agent  │   │  Search  │   │  Writer  │      │   │
│  │    └─────────┘   │  Agent   │   │  Agent   │      │   │
│  │                  └──────────┘   └──────────┘      │   │
│  │                       │                            │   │
│  │                       ▼                            │   │
│  │                  Exa Search API                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
