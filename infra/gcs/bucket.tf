# GCS Bucket Configuration
# Phase 04: GCS & Pub/Sub Ingestion Triggers

resource "google_storage_bucket" "code_snapshots" {
  name          = var.gcs_bucket_name
  project       = var.project_id
  location      = var.bucket_location
  storage_class = var.bucket_storage_class

  labels = var.bucket_labels

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30 # Keep versions for 30 days
    }
    action {
      type = "Delete"
    }
  }
}

output "bucket_name" {
  description = "The name of the created GCS bucket"
  value      = google_storage_bucket.code_snapshots.name
}

output "bucket_self_link" {
  description = "Self link to the GCS bucket"
  value      = google_storage_bucket.code_snapshots.self_link
}

output "bucket_url" {
  description = "Console URL for the GCS bucket"
  value      = "https://console.cloud.google.com/storage/browser/${var.gcs_bucket_name}"
}