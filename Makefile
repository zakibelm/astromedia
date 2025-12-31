.PHONY: help dev stop restart logs shell clean test lint antigravity claude

# =====================================
# COLORS FOR OUTPUT
# =====================================
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# =====================================
# DEFAULT TARGET
# =====================================
help: ## Show this help message
	@echo "$(BLUE)AstroMedia v2 Enhanced - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# =====================================
# DEVELOPMENT
# =====================================
dev: ## Start all services in development mode
	@echo "$(BLUE)Starting AstroMedia v2...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo ""
	@echo "Access points:"
	@echo "  • API:         http://localhost:8000"
	@echo "  • API Docs:    http://localhost:8000/docs"
	@echo "  • n8n:         http://localhost:5678"
	@echo "  • Antigravity: http://localhost:3000"
	@echo "  • Flower:      http://localhost:5555"
	@echo "  • Grafana:     http://localhost:3001"
	@echo "  • Prometheus:  http://localhost:9090"

stop: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)Restarting services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

restart-api: ## Restart API only
	docker-compose restart api

restart-worker: ## Restart Celery worker only
	docker-compose restart worker

rebuild: ## Rebuild and restart all services
	@echo "$(BLUE)Rebuilding services...$(NC)"
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "$(GREEN)✓ Services rebuilt$(NC)"

# =====================================
# LOGS & DEBUGGING
# =====================================
logs: ## Show logs for all services
	docker-compose logs -f

logs-api: ## Show API logs
	docker-compose logs -f api

logs-worker: ## Show worker logs
	docker-compose logs -f worker

logs-n8n: ## Show n8n logs
	docker-compose logs -f n8n

shell: ## Open shell in API container
	docker-compose exec api bash

shell-worker: ## Open shell in worker container
	docker-compose exec worker bash

shell-db: ## Open psql in database
	docker-compose exec db psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-astromedia}

# =====================================
# DATABASE
# =====================================
db-migrate: ## Run Supabase migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	docker-compose exec api python -m app.scripts.migrate
	@echo "$(GREEN)✓ Migrations completed$(NC)"

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	docker-compose exec api python -m app.scripts.seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)⚠️  WARNING: This will delete ALL data!$(NC)"
	@read -p "Type 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose down -v; \
		docker-compose up -d db; \
		sleep 5; \
		make db-migrate; \
		echo "$(GREEN)✓ Database reset$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

db-backup: ## Backup database
	@echo "$(BLUE)Backing up database...$(NC)"
	mkdir -p ./backups
	docker-compose exec -T db pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-astromedia} > ./backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup created in ./backups/$(NC)"

# =====================================
# ANTIGRAVITY & CLAUDE CODE
# =====================================
antigravity: ## Open Antigravity UI
	@echo "$(BLUE)Opening Antigravity...$(NC)"
	@echo "Access at: http://localhost:3000"
	@xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || echo "Open http://localhost:3000 in your browser"

claude: ## Start Claude Code CLI
	@echo "$(BLUE)Starting Claude Code...$(NC)"
	docker-compose exec api claude

# =====================================
# AGENTS
# =====================================
list-agents: ## List all available agents
	@echo "$(BLUE)Available Agents:$(NC)"
	@docker-compose exec api python -c "from app.agents import list_agents; list_agents()"

test-agent: ## Test specific agent (usage: make test-agent AGENT=cmo)
	@echo "$(BLUE)Testing $(AGENT) agent...$(NC)"
	docker-compose exec api python -m app.scripts.test_agent $(AGENT)

generate-agent: ## Generate new agent via Antigravity (usage: make generate-agent AGENT=seo)
	@echo "$(BLUE)Generating $(AGENT) agent...$(NC)"
	@echo "1. Open Antigravity: http://localhost:3000"
	@echo "2. Create plan for $(AGENT) agent"
	@echo "3. Run: make claude"
	@echo "4. Implement plan with Claude Code"

# =====================================
# N8N WORKFLOWS
# =====================================
import-workflow: ## Import n8n workflow (usage: make import-workflow WORKFLOW=name)
	@echo "$(BLUE)Importing workflow: $(WORKFLOW)$(NC)"
	@if [ -f "./n8n-workflows/$(WORKFLOW).json" ]; then \
		curl -X POST http://localhost:5678/rest/workflows \
		-H "Content-Type: application/json" \
		-d @./n8n-workflows/$(WORKFLOW).json; \
		echo "$(GREEN)✓ Workflow imported$(NC)"; \
	else \
		echo "$(RED)✗ Workflow file not found$(NC)"; \
	fi

export-workflows: ## Export all n8n workflows
	@echo "$(BLUE)Exporting workflows...$(NC)"
	mkdir -p ./n8n-workflows/backups
	curl -X GET http://localhost:5678/rest/workflows > ./n8n-workflows/backups/all_workflows_$(shell date +%Y%m%d_%H%M%S).json
	@echo "$(GREEN)✓ Workflows exported$(NC)"

list-workflows: ## List active n8n workflows
	@echo "$(BLUE)Active Workflows:$(NC)"
	@curl -s http://localhost:5678/rest/workflows | jq -r '.data[] | "\(.id) - \(.name)"'

# =====================================
# TESTING
# =====================================
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	docker-compose exec api pytest tests/ -v

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	docker-compose exec api pytest tests/unit/ -v

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	docker-compose exec api pytest tests/integration/ -v

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running E2E tests...$(NC)"
	docker-compose exec api pytest tests/e2e/ -v

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	docker-compose exec api pytest tests/ --cov=app --cov-report=html --cov-report=term
	@echo "$(GREEN)Coverage report: ./htmlcov/index.html$(NC)"

# =====================================
# CODE QUALITY
# =====================================
lint: ## Run linting (Ruff)
	@echo "$(BLUE)Running Ruff linter...$(NC)"
	docker-compose exec api ruff check app/ workers/

lint-fix: ## Auto-fix linting issues
	@echo "$(BLUE)Auto-fixing linting issues...$(NC)"
	docker-compose exec api ruff check app/ workers/ --fix

format: ## Format code (Black + Ruff)
	@echo "$(BLUE)Formatting code...$(NC)"
	docker-compose exec api black app/ workers/
	docker-compose exec api ruff format app/ workers/

type-check: ## Run type checking (Mypy)
	@echo "$(BLUE)Running type checker...$(NC)"
	docker-compose exec api mypy app/ workers/

quality: lint type-check ## Run all quality checks

# =====================================
# MONITORING
# =====================================
metrics: ## Open Prometheus metrics
	@xdg-open http://localhost:9090 2>/dev/null || open http://localhost:9090 2>/dev/null || echo "Open http://localhost:9090"

dashboard: ## Open Grafana dashboard
	@xdg-open http://localhost:3001 2>/dev/null || open http://localhost:3001 2>/dev/null || echo "Open http://localhost:3001"

flower: ## Open Celery Flower
	@xdg-open http://localhost:5555 2>/dev/null || open http://localhost:5555 2>/dev/null || echo "Open http://localhost:5555"

# =====================================
# SKILLS
# =====================================
list-skills: ## List all available skills
	@echo "$(BLUE)Available Skills:$(NC)"
	@ls -1 skills/

create-skill: ## Create new skill template (usage: make create-skill NAME=my-skill)
	@echo "$(BLUE)Creating skill: $(NAME)$(NC)"
	mkdir -p skills/$(NAME)/{scripts,references,assets}
	cp skills/templates/SKILL.md skills/$(NAME)/SKILL.md
	@echo "$(GREEN)✓ Skill template created at skills/$(NAME)$(NC)"

validate-skill: ## Validate skill structure (usage: make validate-skill NAME=astromedia-agents)
	@echo "$(BLUE)Validating skill: $(NAME)$(NC)"
	docker-compose exec api python -m app.scripts.validate_skill $(NAME)

# =====================================
# DEPLOYMENT
# =====================================
build: ## Build Docker images
	@echo "$(BLUE)Building images...$(NC)"
	docker-compose build
	@echo "$(GREEN)✓ Images built$(NC)"

deploy-dev: ## Deploy to development environment
	@echo "$(BLUE)Deploying to development...$(NC)"
	docker-compose -f docker-compose.yml up -d
	@echo "$(GREEN)✓ Deployed to development$(NC)"

deploy-prod: ## Deploy to production (requires production config)
	@echo "$(BLUE)Deploying to production...$(NC)"
	@echo "$(RED)⚠️  Not implemented yet - requires production setup$(NC)"

# =====================================
# CLEANUP
# =====================================
clean: ## Remove stopped containers and unused images
	@echo "$(YELLOW)Cleaning up...$(NC)"
	docker-compose down
	docker system prune -f
	@echo "$(GREEN)✓ Cleanup completed$(NC)"

clean-all: ## Remove all containers, volumes, and images (WARNING: destroys data)
	@echo "$(RED)⚠️  WARNING: This will delete ALL data and images!$(NC)"
	@read -p "Type 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose down -v --rmi all; \
		docker system prune -af --volumes; \
		echo "$(GREEN)✓ Complete cleanup done$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

# =====================================
# UTILITIES
# =====================================
env-check: ## Check if all required environment variables are set
	@echo "$(BLUE)Checking environment variables...$(NC)"
	@docker-compose exec api python -m app.scripts.check_env

install-deps: ## Install Python dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	docker-compose exec api pip install -r requirements.txt
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

docs: ## Generate API documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	docker-compose exec api python -m app.scripts.generate_docs
	@echo "$(GREEN)✓ Docs generated at ./docs/$(NC)"

version: ## Show version info
	@echo "$(BLUE)AstroMedia Version Information:$(NC)"
	@grep "APP_VERSION" .env.example | cut -d'=' -f2

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose ps
