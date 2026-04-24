# GCS Bucket Variables
# Phase 04: GCS & Pub/Sub Ingestion Triggers

variable "project_id" {
  description = "GCP project ID"
  type       = string
}

variable "gcs_bucket_name" {
  description = "Name of the code snapshots GCS bucket"
  type       = string
  default    = "code-snapshots"
}

variable "bucket_location" {
  description = "GCS bucket location (regional)"
  type       = string
  default    = "us-central1"
}

variable "bucket_storage_class" {
  description = "Default storage class"
  type       = string
  default    = "STANDARD"
}

variable "bucket_labels" {
  description = "Labels to apply to GCS resources"
  type = map(string)
  default = {
    environment = "production"
    team       = "devbridge"
  }
}