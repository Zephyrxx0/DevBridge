import operator
from typing import Annotated, Optional, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    hindsight_memory: Optional[str]
    model_used: Optional[str]
    cascaded: bool
    next: str
    fallback: bool
