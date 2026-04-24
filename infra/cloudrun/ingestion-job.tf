# Cloud Run Job Configuration
# Phase 04: GCS & Pub/Sub Ingestion Triggers

resource "google_cloudrunv2_job" "code_ingestion_job" {
  name     = var.cloud_run_job_name
  location = var.cloud_run_job_region

  labels = {
    environment = "production"
    team       = "devbridge"
  }

  template {
    labels = {
      app = "code-ingestion"
    }

    container_concurrency = var.cloud_run_job_task_concurrency

    retry_policy {
      max_retries = var.cloud_run_job_max_retries
    }

    template {
      max_retries = var.cloud_run_job_max_retries

      container {
        image = var.cloud_run_job_image

        resources {
          limits = {
            cpu    = var.cloud_run_job_cpu
            memory = var.cloud_run_job_memory
          }
        }

        env {
          name  = "GCS_BUCKET_NAME"
          value = var.gcs_bucket_name
        }

        env {
          name  = "PUBSUB_TOPIC"
          value = var.pubsub_topic_name
        }

        env {
          name  = "LOG_LEVEL"
          value = "INFO"
        }

        command = ["python", "-m", "api.ingest.trigger"]

        liveness_probe {
          failure_threshold = 3
          period_seconds = 60
        }
      }

      service_account = var.service_account_email
    }
  }
}

output "job_name" {
  description = "The name of the Cloud Run Job"
  value      = google_cloudrunv2_job.code_ingestion_job.name
}

output "job_uri" {
  description = "URI of the Cloud Run Job"
  value      = google_cloudrunv2_job.code_ingestion_job.uri
}

output "job_uid" {
  description = "Unique ID of the Cloud Run Job"
  value      = google_cloudrunv2_job.code_ingestion_job.uid
}