# Cloud Run Job Pub/Sub Trigger
# Phase 04: GCS & Pub/Sub Ingestion Triggers

# Eventarc trigger for Pub/Sub to Cloud Run Job
resource "google_eventarc_trigger" "code_ingestion_trigger" {
  name     = "code-ingestion-trigger"
  location = var.cloud_run_job_region

  matching_criteria {
    attribute = "type"
    value    = "google.cloud.pubsub.messagePublished"
  }

  matching_criteria {
    attribute = "topic_id"
    value    = var.pubsub_topic_name
  }

  destination {
    cloud_run_job {
      service  = var.cloud_run_job_name
      region  = var.cloud_run_job_region
    }
  }

  service_account = var.service_account_email

  labels {
    environment = "production"
    team       = "devbridge"
  }
}

output "trigger_name" {
  description = "The name of the Eventarc trigger"
  value      = google_eventarc_trigger.code_ingestion_trigger.name
}

output "trigger_id" {
  description = "The ID of the Eventarc trigger"
  value      = google_eventarc_trigger.code_ingestion_trigger.id
}