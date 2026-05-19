# Phase 30 Discussion Log

- **Date:** 2026-05-20
- **Phase:** 30 - Speculative Router Setup

## Area: Validation Strategy
- **Options presented:**
  - Schema Validation (Use Pydantic/JSON schema to detect malformed outputs. Fast and reliable.)
  - Evaluator Pass (Use a separate Gemma-9B 'evaluator' pass to check quality. Higher fidelity but more latency.)
- **Selected:** Schema Validation

## Area: Concurrency Enforcement
- **Options presented:**
  - Worker Semaphore (Use an in-memory Semaphore in the worker node. Simple and effective for single-GPU.)
  - Redis Limiter (Use an external Redis-based rate limiter. Better for multi-node but adds complexity.)
- **Selected:** None required (Remote models via AI Studio)
- **Note:** User clarified that Qwen model is replaced by Gemini 2.5 Flash + Gemma-2-9B-it via Google AI Studio.

## Area: Escalation Scope
- **Options presented:**
  - Per-Turn Escalation (Only escalate the turn that failed validation. Save compute but may lead to inconsistent session quality.)
  - Session Escalation (Once escalated, stay on 'Big' for the rest of the conversation. Higher quality but higher compute cost.)
- **Selected:** Per-Turn Escalation
