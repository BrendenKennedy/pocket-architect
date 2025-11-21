.PHONY: help install install-dev test lint format type-check clean build publish docs

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install package in production mode
	pip install -e .

install-dev: ## Install package with development dependencies
	pip install -e ".[dev]"
	pre-commit install

test: ## Run tests
	pytest

test-cov: ## Run tests with coverage
	pytest --cov=mlcloud --cov-report=html --cov-report=term

lint: ## Run linters
	ruff check mlcloud tests
	mypy mlcloud

format: ## Format code
	black mlcloud tests
	ruff format mlcloud tests

type-check: ## Run type checker
	mypy mlcloud

clean: ## Clean build artifacts
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov/
	find . -type d -name __pycache__ -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete

build: clean ## Build package
	python -m build

publish-test: build ## Publish to TestPyPI
	twine upload --repository testpypi dist/*

publish: build ## Publish to PyPI
	twine upload dist/*

docs: ## Generate documentation (placeholder)
	@echo "Documentation generation not yet implemented"

check: lint type-check test ## Run all checks (lint, type-check, test)

ci: install-dev check ## Run CI checks locally

