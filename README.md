## Data

I-94 forms are parsed using `react-pdftotext`. However, there are spacing issues in some instances, so in future iterations it might be a good idea to pivot to OCR for more consistent parsing. Currently, only electronic I-94 forms with [this example's format](https://manoa.hawaii.edu/fsis/wp-content/uploads/sites/67/2020/12/SampleI94.pdf) are supported.

## Getting Started

### Install pnpm package manager

`pnpm` is a package manager built on top of `npm` and is much faster than `npm`, being highly disk efficient and solving inherent issues in `npm`.

Install `pnpm` if you don't already have it:

```
npm install -g pnpm
```

**Optional: set up a shorter alias like pn instead**

For POSIX systems, add the following to your .bashrc, .zshrc, or config.fish:

`alias pn=pnpm`

For Powershell (Windows), go to a Powershell window with admin rights and run:

`notepad $profile.AllUsersAllHosts`

In the profile.ps1 file that opens, put:

`set-alias -name pn -value pnpm`

Now whenever you have to run a `pnpm` cmd, you can type in `pn` (or whatever alias you created) instead.

### Set up Supabase and Clerk

Create projects on [Supabase](https://supabase.com/) and [Clerk](https://clerk.com)

In Supabase, go to Storage in the left sidebar and create a private bucket called `user-documents`.

Keep your Supabase and Clerk dashboard tabs open since we will need to do additional configuration to the local website

### Install ngrok

`ngrok` is needed to add webhooks to Clerk since Clerk needs a publicly accessible HTTPS URL (it can't access something like http://localhost:3000/).

Follow installation instructions [here](https://ngrok.com/downloads)

### Set up repository

Clone the repository and go into the directory:

```
git clone https://github.com/soph-lin/visa-app.git

cd visa-app
```

Install packages:

```
pnpm i
```

Create an `.env` file in the root directory and add the following Supabase and Clerk keys

Note to add the `&connect_timeout=300` at the end of the Supabase connection strings! This helps Prisma connect to Supabase by lengthening the wait time for connection and prevents `Can't reach database server at [server]` error message. If you still have this issue, try increasing the timeout.

```
# Supabase
DATABASE_URL=<...>&connect_timeout=300
DIRECT_URL=<...>&connect_timeout=300

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<...>
CLERK_SECRET_KEY=<...>

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
```

Generate Prisma schema and push to Supabase database

```
pnpm prisma generate
pnpm prisma db push
```

### Run ngrok server

Run:

```
ngrok http 3000 # The number after http corresponds to what port your local server is on (e.g. http://localhost:3000)

```

You will see something like below:

```
Forwarding          <NGROK_PUBLIC_WEBSITE> -> http://localhost:3000
```

In Clerk > Configure > Developers > Webhooks, create a webhook with `user.created` permission with the endpoint:

`<NGROK_PUBLIC_WEBSITE>/api/webhooks/clerk`

Copy the webhook's signing secret and in the `.env` file add:

```
CLERK_WEBHOOK_SECRET=<YOUR_SIGNING_SECRET>
```

Every time you close the terminal that runs `ngrok`, you will need to re-run the command and update the webhook domain.

### Run the development server

Run:

```
pnpm dev
```

Open up your browser and go to [http://localhost:3000](http://localhost:3000) to see the website.
