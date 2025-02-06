# Alva BE

## 📌 Prerequisites
Ensure you have installed:

- Node.js (Recommended: v18+)
- MongoDB (Local instance or use MongoDB Atlas)
- npm


## Clone & install
```shell
git clone <repo-url> && cd $_
npm i
```

## Environmental variables
Create a .env file:

```shell
MONGO_URI=mongodb://localhost:27017/energytracker
PORT=3000
```

## Start MongoDB
```shell
mongod --dbpath ./data/db
```

## Seed with mock data
```shell
npm run seed
```

## Start the backend
```shell
npm run dev
```

## API Endpoints

🎯 API Endpoints
📊 Trends
- GET /trends/daily?date=YYYY-MM-DD
- GET /trends/weekly?date=YYYY-MM-DD
- GET /trends/monthly?date=YYYY-MM
🔍 Insights
- GET /insights
