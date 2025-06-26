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

4. Run the development server

```
pnpm dev
```

5. Open up your browser and go to [http://localhost:3000](http://localhost:3000) to see the website.
