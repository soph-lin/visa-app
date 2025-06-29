## Getting Started

1. Clone the repository and go into the directory:

```
git clone https://github.com/soph-lin/visa-app.git

cd visa-app
```

2. Install pnpm if you don't already have it:

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

3. Install packages:

```
pnpm i
```

4. Create projects on Supabase and Clerk and add keys to `.env` file (create one in the root directory):

```
# Supabase
DATABASE_URL=<...>
DIRECT_URL=<...>

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<...>
CLERK_SECRET_KEY=<...>

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
```

5. Generate Prisma schema

```
pnpm prisma generate
```

6. Run the development server

```
pnpm dev
```

7. Open up your browser and go to [http://localhost:3000](http://localhost:3000) to see the website.
