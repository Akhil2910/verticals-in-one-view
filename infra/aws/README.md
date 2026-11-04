# Deploying to AWS

One CloudFormation stack (`nium-stack.yaml`) creates everything:

| Piece | What | Approx. cost (Mumbai, on-demand) |
|---|---|---|
| App server | EC2 `t4g.small`, Amazon Linux 2023, Node 22, runs as a systemd service | ~US$13/month |
| Database | RDS PostgreSQL 16 `db.t4g.micro`, 20 GB encrypted, private subnet, 7-day backups | ~US$15/month |
| HTTPS | CloudFront in front of the server (`https://xxxx.cloudfront.net`) | a few dollars at this traffic |
| Secret | Database password in Secrets Manager | ~US$0.40/month |

Check current prices in the AWS Pricing Calculator; these are rough.

**Security notes**
- Browsers talk to CloudFront over HTTPS. **The hop from CloudFront to the server is plain HTTP** (port 3000, which only accepts CloudFront's addresses). For a government deployment, the next step is a custom domain such as `records.nium.org.in` with an AWS certificate, so that hop is encrypted too.
- The server has no SSH. Admins reach it through **Systems Manager → Session Manager** in the AWS console.
- The database isn't reachable from the internet, only from the app server.

## First deployment

You need an AWS account and permission to create VPCs, EC2, RDS, IAM roles, Secrets Manager secrets and CloudFront distributions.

1. **Choose the branch.** The server builds from GitHub (`main` by default). Push the AWS version of the code there first. Remember that pushing to `main` also updates the Lovable-hosted app, which still expects Supabase. To keep Lovable working until you switch over, push to another branch (for example `aws-release`) and deploy that.
2. Open **AWS CloudShell** in the console (top bar, `>_` icon), in the region you want (for example Asia Pacific (Mumbai) `ap-south-1`).
3. Run:
   ```bash
   git clone https://github.com/Akhil2910/verticals-in-one-view.git
   cd verticals-in-one-view
   git checkout aws-release    # skip if you deploy main
   bash infra/aws/deploy.sh Branch=aws-release   # or just: bash infra/aws/deploy.sh
   ```
   It takes about 20–25 minutes. At the end it prints `AppUrl`.
4. **Fresh start?** Open `AppUrl/setup` and create the admin. The 8 placeholder verticals are created with it.
   **Moving existing data?** Do the import below *before* opening `/setup`.

## Moving the data from another copy of this app

Use this when the data already lives in this app's own database, for example the local copy on a laptop. It copies verticals, logins (with their passwords), projects and uploaded files. Sign-in sessions are not copied.

1. On the machine with the data:
   ```bash
   DATABASE_URL=postgres://... npm run db:export -- nium-data.json
   ```
   The file holds password hashes and project documents. **Never commit it to git**; copy it to the server directly (for example through S3 with a presigned link, as described below).
2. On the server, after the first start has created the tables and **before** opening `/setup`:
   ```bash
   sudo -iu nium
   cd app
   infra/aws/with-db.sh npm run db:restore -- ~/nium-data.json
   rm ~/nium-data.json
   ```
   The restore runs in one transaction and refuses to run on a database that already has records.

## Moving the existing data from Supabase (Lovable Cloud)

The importer copies verticals, logins and projects, keeping their ids.

**Best source: a full database backup** (`.backup` file, downloaded from Lovable Cloud and unzipped). It includes Supabase's `auth.users` table, so **everyone keeps their current password**. Nobody needs a temporary one, and the app upgrades each password's storage format on that person's first sign-in. Copy the file to the server (for example through S3 as described below), then run:
```bash
infra/aws/with-db.sh npm run db:import-supabase -- --backup ~/verticals-in-one-view.backup
```

With the API or CSV sources below, password hashes aren't available, so **each imported login gets a temporary password** and must choose a new one at first sign-in.

1. Open the app server: EC2 console → instance `nium-records-app` → **Connect → Session Manager**.
2. Switch to the app user:
   ```bash
   sudo -iu nium
   cd app
   ```
3. Run the import with **one** of these sources:
   - **Supabase API** (needs the project URL and the service-role key from Lovable Cloud → Settings / API):
     ```bash
     SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY='...' infra/aws/with-db.sh npm run db:import-supabase
     ```
   - **CSV exports** of the `verticals`, `user_roles` and `projects` tables, saved as `verticals.csv`, `user_roles.csv` and `projects.csv`. Get them onto the server any way you like. One option: upload them to an S3 bucket from CloudShell, then fetch them with presigned links (`aws s3 presign s3://bucket/verticals.csv`) and `curl -o`. Then run:
     ```bash
     infra/aws/with-db.sh npm run db:import-supabase -- --csv ~/export
     ```
4. The temporary passwords are in `import-output/temp-passwords-<time>.csv`. Read them (`cat import-output/*.csv`), hand them to each person privately, then delete the file: `rm -r import-output`.

The import is safe to re-run; rows that already exist are skipped. It refuses to run if `/setup` was already used, because the placeholder verticals would clash with the imported ones.

## Shipping updates

Push to the deployed branch, then in CloudShell (inside the cloned repo):
```bash
bash infra/aws/update.sh
```
It pulls, builds and restarts the server. Database migrations in `db/migrations/` run automatically on start.

## Useful commands on the server (Session Manager)

```bash
sudo systemctl status nium          # is it running?
sudo journalctl -u nium -n 100      # recent logs
sudo systemctl restart nium
```

## Removing everything

Delete the `nium-records` stack in the CloudFormation console. The database has deletion protection, and a final snapshot is kept when it is deleted. Turn protection off on the RDS instance first if you really want it gone.
