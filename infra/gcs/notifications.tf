# GCS Bucket Notifications to Pub/Sub
# Phase 04: GCS & Pub/Sub Ingestion Triggers

# Notification for object finalize (upload/create events)
resource "google_storage_notification" "finalize" {
  bucket         = var.gcs_bucket_name
  payload_format = "JSON"
  event_type    = "google.storage.object.finalize"
  topic        = var.pubsub_topic_name
  name         = "code-snapshot-finalize"
}

# Notification for object delete events
resource "google_storage_notification" "delete" {
  bucket         = var.gcs_bucket_name
  payload_format = "JSON"
  event_type    = "google.storage.object.delete"
  topic        = var.pubsub_topic_name
  name         = "code-snapshot-delete"
}

variable "pubsub_topic_name" {
  description = "Name of the Pub/Sub topic for GCS notifications"
  type       = string
  default    = "code-snapshot-events"
}