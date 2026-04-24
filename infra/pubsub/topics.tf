# Pub/Sub Topic and Subscription
# Phase 04: GCS & Pub/Sub Ingestion Triggers

# Main topic for GCS events
resource "google_pubsub_topic" "code_snapshot_events" {
  name = var.pubsub_topic_name

  message_retention_duration = var.message_retention_duration

  labels = {
    environment = "production"
    team       = "devbridge"
  }
}

# Dead-letter topic for failed messages
resource "google_pubsub_topic" "code_snapshot_dlq" {
  name = "${var.pubsub_topic_name}-dlq"

  message_retention_duration = var.message_retention_duration

  labels = {
    environment = "production"
    team       = "devbridge"
    purpose    = "dead-letter"
  }
}

# Pull subscription for Cloud Run Job
resource "google_pubsub_subscription" "code_snapshot_trigger" {
  name  = "code-snapshot-trigger"
  topic = google_pubsub_topic.code_snapshot_events.name

  ack_deadline_seconds = var.ack_deadline_seconds

  retry_policy {
    minimum_backoff = var.min_retry_duration
    maximum_backoff = var.max_retry_duration
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.code_snapshot_dlq.id
    max_delivery_attempts  = 5
  }

  expiration_policy {
    ttl = "" # Never expires
  }

  labels = {
    environment = "production"
    team       = "devbridge"
  }
}

output "topic_name" {
  description = "The name of the Pub/Sub topic"
  value      = google_pubsub_topic.code_snapshot_events.name
}

output "subscription_name" {
  description = "The name of the Pub/Sub subscription"
  value      = google_pubsub_subscription.code_snapshot_trigger.name
}

output "dlq_topic_name" {
  description = "The name of the dead-letter topic"
  value      = google_pubsub_topic.code_snapshot_dlq.name
}