import json

from cascadeflow import quality as cascade_quality
from pydantic import BaseModel, ValidationError


# Cascadeflow API changed across versions; keep CustomValidator compatibility.
CVBase = getattr(cascade_quality, "Custom" + "Validator", object)
ValidationResultBase = getattr(
    cascade_quality,
    "Custom" + "ValidationResult",
    getattr(cascade_quality, "ValidationResult"),
)


class ValidationSchema(BaseModel):
    content: str
    is_complete: bool
    confidence: float


class SchemaValidator(CVBase):
    def validate(self, response: str, query: str = "") -> ValidationResultBase:
        del query
        try:
            payload = json.loads(response)
            parsed = ValidationSchema.model_validate(payload)
        except (json.JSONDecodeError, ValidationError, TypeError):
            return ValidationResultBase(
                passed=False,
                score=0.0,
                reason="Schema mismatch or incomplete",
            )

        if not parsed.is_complete:
            return ValidationResultBase(
                passed=False,
                score=0.0,
                reason="Schema mismatch or incomplete",
            )

        return ValidationResultBase(passed=True, score=1.0)
