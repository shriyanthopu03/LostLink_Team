# LostLink_Team

LostLink is a secure digital lost-and-found system built with the MERN stack.

## Included features

- Post lost or found items
- Search items by category, title, description, or location
- Match similar lost and found posts with a score and match reasons
- Claim an item with a simple verification question
- Track item status through the recovery flow
- Separate backend and frontend folders
- `.env` support in both folders for local configuration

## Tech stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT
- Frontend: React, Vite, Tailwind CSS

## Project structure

- `backend/` contains the API, models, routes, and server config
- `frontend/` contains the React UI and Tailwind styles

## Environment variables

Backend `.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Frontend `.env`:

- `VITE_API_URL`

## Notes

- Add your MongoDB Atlas connection string in `backend/.env`
- Set `VITE_API_URL` to your backend API URL in `frontend/.env`
- The app is designed to keep the core LostLink features requested in the brief