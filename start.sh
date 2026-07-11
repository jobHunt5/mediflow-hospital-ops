#!/bin/bash

# MediFlow Waste Control Startup Script
# Installs dependencies and runs both backend and frontend servers in harmony.

# Text styling
BOLD='\033[1m'
BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

echo -e "${BOLD}${BLUE}=== MediFlow Waste Control System ===${RESET}"

# Function to clean up background processes on exit
cleanup() {
  echo -e "\n${YELLOW}Stopping backend server...${RESET}"
  if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  exit
}

# Register the trap for cleanup
trap cleanup INT TERM EXIT

# Step 1: Install backend dependencies
echo -e "${BOLD}1/5 Installing backend dependencies...${RESET}"
cd backend
npm install
cd ..

# Step 2: Install frontend dependencies
echo -e "${BOLD}2/5 Installing frontend dependencies...${RESET}"
cd frontend
npm install
cd ..

# Step 3: Database — needs Postgres running and backend/.env configured
# (copy backend/.env.example -> backend/.env and fill in DATABASE_URL / JWT_SECRET).
echo -e "${BOLD}3/5 Applying database migrations...${RESET}"
cd backend
if [ ! -f .env ]; then
  echo -e "${YELLOW}backend/.env not found — copy backend/.env.example and fill in DATABASE_URL / JWT_SECRET first.${RESET}"
  exit 1
fi
npm run db:migrate -- --name init 2>/dev/null || npm run db:deploy
cd ..

# Step 4: Launch Express backend server
echo -e "${BOLD}4/5 Starting backend server...${RESET}"
cd backend
npm run start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}Backend running in background (PID: $BACKEND_PID)${RESET}"

# Step 5: Launch Vite React frontend dev server
echo -e "${BOLD}5/5 Starting frontend dev server...${RESET}"
cd frontend
npm run dev
