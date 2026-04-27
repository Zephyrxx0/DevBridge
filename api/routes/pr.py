import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.db.models import RepoConfig
from api.agents.pr_reviewer import create_pr_reviewer_agent

router = APIRouter(tags=["pr"])
logger = logging.getLogger(__name__)

class PRAnalyzeRequest(BaseModel):
    repo_id: str
    pr_number: int

class PRConfigUpdate(BaseModel):
    repo_id: str
    review_depth: str

@router.post("/pr/analyze")
async def analyze_pr(request: PRAnalyzeRequest):
    """Manually trigger a PR review analysis."""
    try:
        # Get repository configuration for review depth
        config = await RepoConfig.get_config(request.repo_id)
        
        # Initialize the PR reviewer agent
        agent = create_pr_reviewer_agent()
        
        # Construct input for the agent
        input_data = {
            "messages": [
                {
                    "role": "user", 
                    "content": f"Please perform a {config.review_depth} review of PR #{request.pr_number} in repository '{request.repo_id}'."
                }
            ]
        }
        
        # Invoke agent asynchronously
        result = await agent.ainvoke(input_data)
        
        # Extract the final response message
        if "messages" in result and result["messages"]:
            last_message = result["messages"][-1]
            content = getattr(last_message, "content", str(last_message))
            return {"summary": content}
        
        return {"summary": "Analysis triggered successfully, but no summary was generated."}
        
    except Exception as e:
        logger.exception(f"Manual PR analysis failed for {request.repo_id}#{request.pr_number}")
        raise HTTPException(status_code=500, detail=f"PR analysis failed: {str(e)}")

@router.post("/pr/config")
async def update_config(request: PRConfigUpdate):
    """Update review depth configuration for a repository."""
    if request.review_depth not in ["basic", "deep"]:
         raise HTTPException(status_code=400, detail="review_depth must be either 'basic' or 'deep'")
    
    try:
        config = await RepoConfig.update_config(request.repo_id, request.review_depth)
        return {
            "repo_id": str(config.repo_id), 
            "review_depth": config.review_depth,
            "status": "updated"
        }
    except Exception as e:
        logger.exception(f"Failed to update config for {request.repo_id}")
        raise HTTPException(status_code=500, detail="Failed to update configuration")

@router.get("/pr/config/{repo_id}")
async def get_config(repo_id: str):
    """Retrieve current review depth configuration for a repository."""
    try:
        config = await RepoConfig.get_config(repo_id)
        return {
            "repo_id": str(config.repo_id), 
            "review_depth": config.review_depth
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve config for {repo_id}")
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration")
