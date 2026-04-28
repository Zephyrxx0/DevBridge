# Pub/Sub Topic Variables
# Phase 04: GCS & Pub/Sub Ingestion Triggers

variable "pubsub_topic_name" {
  description = "Name of the Pub/Sub topic for code snapshot events"
  type       = string
  default    = "code-snapshot-events"
}

variable "message_retention_duration" {
  description = "Message retention duration in seconds (7 days = 604800)"
  type       = string
  default    = "604800s"
}

variable "ack_deadline_seconds" {
  description = "Ack deadline for subscription in seconds"
  type       = number
  default    = 600
}

variable "min_retry_duration" {
  description = "Minimum retry backoff duration in seconds"
  type       = string
  default    = "10s"
}

variable "max_retry_duration" {
  description = "Maximum retry backoff duration in seconds"
  type       = string
  default    = "600s"
}