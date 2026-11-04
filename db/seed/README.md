# One-time data load (temporary)

`nium_data.sql.enc` is the records from the local copy (8 verticals, 10 logins, 54 projects,
3 files), encrypted with AES-256. The passphrase is **not** in git; ask the person who made it.
Delete this folder from the repo once the server is loaded.

On the app server (EC2 → Connect → Session Manager), after `infra/aws/update.sh` has run:

```bash
sudo -iu nium
cd app && git pull
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in db/seed/nium_data.sql.enc -out ~/nium_data.sql
# type the passphrase when asked
infra/aws/with-db.sh sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ~/nium_data.sql'
rm ~/nium_data.sql
```

If `psql` is missing, install it first (as a user with sudo): `sudo dnf install -y postgresql16`.

`nium_data.sql` replaces **all** records and signs everyone out, in one transaction: if any
statement fails, nothing changes.
