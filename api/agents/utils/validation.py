import json
import inspect

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
    @staticmethod
    def _build_result(passed: bool, score: float, reason: str) -> ValidationResultBase:
        params = set(inspect.signature(ValidationResultBase).parameters.keys())
        kwargs = {"passed": passed, "score": score, "reason": reason}
        if "checks" in params:
            kwargs["checks"] = []
        if "details" in params:
            kwargs["details"] = {}
        return ValidationResultBase(**kwargs)

    def validate(self, response: str, query: str = "") -> ValidationResultBase:
        del query
        try:
            payload = json.loads(response)
            parsed = ValidationSchema.model_validate(payload)
        except (json.JSONDecodeError, ValidationError, TypeError):
            return self._build_result(False, 0.0, "Schema mismatch or incomplete")

        if not parsed.is_complete:
            return self._build_result(False, 0.0, "Schema mismatch or incomplete")

        return self._build_result(True, 1.0, "Schema valid")
