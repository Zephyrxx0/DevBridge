# Cloud Run Job Variables
# Phase 04: GCS & Pub/Sub Ingestion Triggers

variable "cloud_run_job_name" {
  description = "Name of the Cloud Run Job"
  type       = string
  default    = "code-ingestion-job"
}

variable "cloud_run_job_image" {
  description = "Container image for the Cloud Run Job"
  type       = string
  default    = "gcr.io/[PROJECT_ID]/code-ingestion-job:latest"
}

variable "cloud_run_job_region" {
  description = "Region for Cloud Run Job deployment"
  type       = string
  default    = "us-central1"
}

variable "cloud_run_job_memory" {
  description = "Memory allocation (e.g., 2Gi)"
  type       = string
  default    = "2Gi"
}

variable "cloud_run_job_cpu" {
  description = "CPU allocation (1 = 1 vCPU)"
  type       = number
  default    = 1
}

variable "cloud_run_job_timeout" {
  description = "Job timeout in seconds"
  type       = number
  default    = 3600
}

variable "cloud_run_job_max_retries" {
  description = "Maximum number of retries"
  type       = number
  default    = 3
}

variable "cloud_run_job_task_concurrency" {
  description = "Number of parallel tasks"
  type       = number
  default    = 10
}

variable "service_account_email" {
  description = "Service account email for Cloud Run Job"
  type       = string
}