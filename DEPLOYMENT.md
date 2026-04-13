# Deployment Guide - Render Cloud

Your Online Voting application is now ready for cloud deployment! 🚀

## What's Been Prepared

✅ Updated `requirements.txt` with all dependencies  
✅ Created `Procfile` for Render  
✅ Updated `settings.py` for production  
✅ Created `.env.example` for environment variables  
✅ Added `runtime.txt` for Python version  

---

## Step 1: Push Code to GitHub

Render deploys from GitHub repositories.

```bash
# Initialize Git (if not done)
git init
git add .
git commit -m "Prepare for Render deployment"

# Create new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create .gitignore

Create `.gitignore` to exclude sensitive files:

```
.env
*.pyc
__pycache__/
*.log
venv/
db.sqlite3
.DS_Store
staticfiles/
```

Then commit:
```bash
git add .gitignore
git commit -m "Add gitignore"
git push
```

---

## Step 3: Sign Up on Render

1. Go to: https://render.com
2. Sign up with GitHub (easiest)
3. Connect your GitHub account

---

## Step 4: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Select your GitHub repository
3. Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `online-voting-2k26` (or any name) |
| **Environment** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn Onlinevoting2026.wsgi:application` |
| **Plan** | Free (or Paid if needed) |

4. Click **"Create Web Service"**

---

## Step 5: Add Environment Variables

In Render dashboard:
1. Go to your service's **"Environment"** tab
2. Add these variables:

```
DEBUG=False
SECRET_KEY=generate-random-key-here-min-50-chars
ALLOWED_HOSTS=your-app-name.onrender.com
TWILIO_ACCOUNT_SID=your-account-sid-here
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

**How to generate SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

3. Click **"Save"** - deployment will restart automatically

---

## Step 6: Run Migrations on Cloud

After first deployment, run migrations:

1. Go to **"Shell"** tab in Render dashboard
2. Run:
```bash
python manage.py migrate
python manage.py createsuperuser
```

3. Follow prompts to create admin account

---

## Step 7: Access Your App

✅ Your app is live at:
```
https://your-app-name.onrender.com
```

- **Main Page:** https://your-app-name.onrender.com/
- **Registration:** https://your-app-name.onrender.com/registration/
- **Login:** https://your-app-name.onrender.com/login/
- **Admin:** https://your-app-name.onrender.com/admin/

---

## Step 8: Test Everything

1. Go to registration page
2. Register a new user with your phone
3. Get OTP on your phone
4. Complete registration
5. Login with credentials
6. Test voting (after creating elections in admin)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Build fails** | Check `requirements.txt` is in root folder |
| **App crashes** | View logs in Render dashboard → "Logs" tab |
| **SMS not working** | Verify Twilio credentials in Environment variables |
| **Pages show 404** | Ensure static files are collected |
| **Database issues** | Run migrations in Shell tab |

---

## Database Notes

⚠️ **SQLite on Render:**
- Works for testing/demo
- Data resets when service restarts
- For production, upgrade to **PostgreSQL** (paid)

**To upgrade to PostgreSQL:**
1. Create PostgreSQL database in Render
2. Update DATABASE config in settings.py
3. Run migrations on new database

---

## Useful Commands (In Render Shell)

```bash
# Check migrations status
python manage.py showmigrations

# Create superuser
python manage.py createsuperuser

# View database (list voters)
python manage.py shell
>>> from Onlinevoting2026.models import Voter
>>> Voter.objects.all()

# Exit shell
>>> exit()
```

---

## Next Steps

- ✅ Deployment complete!
- 📱 Test full registration → OTP → Login → Voting flow
- 💳 Consider upgrading to paid plan for production
- 🔒 Add SSL certificate (automatic on Render)
- 📊 Monitor app in Render dashboard

---

**Your app is now live on the cloud!** 🎉

