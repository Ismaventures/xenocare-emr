-- Migration: Enable pgvector extension for AI Clinical Assistant
-- This extension provides vector similarity search capabilities
CREATE EXTENSION IF NOT EXISTS vector;
