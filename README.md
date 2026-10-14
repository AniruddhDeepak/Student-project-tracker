# Student Project Tracker

A local full-stack project tracker with an Express API and SQLite storage. This
is a workshop demo: it has no login or multi-user isolation.

## Run
Use Node.js 22.18.0 or newer and a PowerShell terminal in this folder.

```powershell
npm.cmd ci
npm.cmd start
```

Open http://localhost:3000. Keep the server terminal running; stop it with
Ctrl+C.

## Files
- `public/index.html` and `public/style.css`: page structure and presentation.
- `public/script.js`: browser UI; it uses `fetch` to call the API.
- `server.js`: local server startup.
- `app.js`: validated project CRUD API.
- `database.js`: SQLite schema and persistence.
- `data/projects.db`: local project records, created when the server starts.

## Request flow
```text
Browser UI
  public/index.html + public/script.js
              | fetch /api/projects (JSON)
              v
       Express routes and validation
                    app.js
              | parameterized SQL
              v
          SQLite database file
           database.js -> data/projects.db
              ^ JSON response
              +---------------- Browser UI
```

## Storage and verification
Projects created in the page are stored in SQLite and survive browser refreshes
and server restarts. Browser `localStorage` records from the earlier workshop
stage are not migrated automatically.

Run the automated CRUD, validation, SQLite persistence, and static-page checks
with:

```powershell
npm.cmd test
```

The test verifies create/list/update/delete responses, rejected invalid input,
and that an updated record survives a server restart. It uses a temporary
database and does not alter `data/projects.db`.

## Limitations
This local demo has no authentication, per-user data separation, or deployment
configuration. Do not put secrets or private data in it. The `data` directory
is local runtime data and should not be committed.
