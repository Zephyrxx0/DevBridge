import operator
from typing import Annotated, Optional, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    hindsight_memory: Optional[str]
    next: str
    fallback: bool
