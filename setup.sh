#!/bin/bash

# =====================================
# ASTROMEDIA V2 ENHANCED - SETUP SCRIPT
# =====================================

set -e  # Exit on error

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =====================================
# HEADER
# =====================================
echo -e "${BLUE}"
cat << "EOF"
   _   ___ _____ ___  ___  __  __ ___ ___ ___   _   __   _____
  /_\ / __|_   _| _ \/ _ \|  \/  | __|   \_ _| /_\ \ \ / /_  )
 / _ \\__ \ | | |   / (_) | |\/| | _|| |) | | / _ \ \ V / / /
/_/ \_\___/ |_| |_|_\\___/|_|  |_|___|___/___/_/ \_\ \_/ /___|

         Agent Média Full-Stack - Setup v2.0.0
EOF
echo -e "${NC}"

# =====================================
# CHECKS
# =====================================
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ IMPORTANT: Please edit .env and add your API keys before continuing!${NC}"
    read -p "Press Enter when you've configured .env, or Ctrl+C to exit..."
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# =====================================
# DIRECTORY SETUP
# =====================================
echo -e "${BLUE}Creating directory structure...${NC}"

# Create necessary directories
mkdir -p app/agents
mkdir -p app/services
mkdir -p app/tools
mkdir -p app/workflows
mkdir -p app/scripts
mkdir -p workers
mkdir -p tests/{unit,integration,e2e}
mkdir -p skills/{astromedia-agents,quebec-marketing,langgraph-orchestration}
mkdir -p antigravity-workspace/{AI-plans,generated/{agents,workflows,tools}}
mkdir -p n8n-workflows
mkdir -p supabase/{migrations,functions,storage}
mkdir -p monitoring/{prometheus,grafana/{dashboards,datasources}}
mkdir -p docs
mkdir -p backups
mkdir -p logs

echo -e "${GREEN}✓ Directory structure created${NC}"

# =====================================
# DOCKER SETUP
# =====================================
echo -e "${BLUE}Building Docker images...${NC}"

# Pull base images first
docker-compose pull db redis n8n

# Build custom images
docker-compose build --no-cache

echo -e "${GREEN}✓ Docker images built${NC}"

# =====================================
# DATABASE SETUP
# =====================================
echo -e "${BLUE}Setting up database...${NC}"

# Start database first
docker-compose up -d db redis

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Check database health
until docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    echo -e "${YELLOW}Waiting for database...${NC}"
    sleep 2
done

echo -e "${GREEN}✓ Database is ready${NC}"

# =====================================
# MIGRATIONS
# =====================================
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
    echo -e "${BLUE}Running database migrations...${NC}"

    # Create a simple migration runner
    cat > /tmp/run_migrations.sh << 'EOFMIGRATE'
#!/bin/bash
for migration in /migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running migration: $(basename $migration)"
        psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f "$migration"
    fi
done
EOFMIGRATE

    chmod +x /tmp/run_migrations.sh
    docker cp /tmp/run_migrations.sh astromedia_db:/tmp/run_migrations.sh
    docker-compose exec -T db bash /tmp/run_migrations.sh
    rm /tmp/run_migrations.sh

    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${YELLOW}⚠ No migrations found, skipping...${NC}"
fi

# =====================================
# SKILLS SETUP
# =====================================
echo -e "${BLUE}Setting up Skills...${NC}"

# Create skill templates if they don't exist
for skill in astromedia-agents quebec-marketing langgraph-orchestration; do
    if [ ! -f "skills/$skill/SKILL.md" ]; then
        echo -e "${YELLOW}Creating template for $skill...${NC}"
        mkdir -p "skills/$skill"/{scripts,references,assets}

        cat > "skills/$skill/SKILL.md" << EOF
---
name: $skill
description: TODO - Add description for $skill
license: MIT
---

# $skill

## Description

TODO - Complete this skill description

## Usage

TODO - Add usage instructions

## Examples

TODO - Add examples
EOF
    fi
done

echo -e "${GREEN}✓ Skills structure created${NC}"

# =====================================
# START ALL SERVICES
# =====================================
echo -e "${BLUE}Starting all services...${NC}"

docker-compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 15

# =====================================
# VERIFY INSTALLATION
# =====================================
echo -e "${BLUE}Verifying installation...${NC}"

# Check if services are running
services=("astromedia_api" "astromedia_worker" "astromedia_n8n" "astromedia_db" "astromedia_redis")
all_running=true

for service in "${services[@]}"; do
    if [ "$(docker ps -q -f name=$service)" ]; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is not running${NC}"
        all_running=false
    fi
done

# =====================================
# COMPLETION MESSAGE
# =====================================
echo ""
echo -e "${BLUE}=====================================
INSTALLATION COMPLETE!
=====================================${NC}"
echo ""

if [ "$all_running" = true ]; then
    echo -e "${GREEN}✓ All services are running successfully!${NC}"
    echo ""
    echo -e "${BLUE}Access Points:${NC}"
    echo -e "  • API:         ${YELLOW}http://localhost:8000${NC}"
    echo -e "  • API Docs:    ${YELLOW}http://localhost:8000/docs${NC}"
    echo -e "  • n8n:         ${YELLOW}http://localhost:5678${NC}"
    echo -e "  • Antigravity: ${YELLOW}http://localhost:3000${NC}"
    echo -e "  • Flower:      ${YELLOW}http://localhost:5555${NC}"
    echo -e "  • Grafana:     ${YELLOW}http://localhost:3001${NC}"
    echo -e "  • Prometheus:  ${YELLOW}http://localhost:9090${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Configure your Supabase project"
    echo -e "  2. Add your API keys to .env (if not done)"
    echo -e "  3. Run: ${GREEN}make test${NC} to verify everything works"
    echo -e "  4. Check the README.md for usage examples"
    echo -e "  5. Start building with: ${GREEN}make antigravity${NC}"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  • ${GREEN}make help${NC}        - Show all available commands"
    echo -e "  • ${GREEN}make logs${NC}        - View service logs"
    echo -e "  • ${GREEN}make antigravity${NC} - Open Antigravity UI"
    echo -e "  • ${GREEN}make claude${NC}      - Start Claude Code CLI"
    echo ""
else
    echo -e "${RED}⚠ Some services failed to start. Check logs with: make logs${NC}"
    echo ""
fi

echo -e "${BLUE}=====================================
Happy Building! 🚀
=====================================${NC}"
