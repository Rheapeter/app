from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from dotenv import load_dotenv
import os
import uuid
import logging
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'trade_union_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "https://vscode-continue.preview.emergentagent.com/auth/google/callback")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-super-secret-key-here")

# OAuth2 scopes for Google Sheets access
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
]

# Create FastAPI app
app = FastAPI(title="Trade Union MIS API", version="1.0.0")

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router with /api prefix
api_router = APIRouter(prefix="/api")

# ===== DATA MODELS =====

class MemberModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    town_name: str = Field(..., description="Name of the town")
    member_name: str = Field(..., description="Name of the Member")
    trade_union_number: str = Field(..., description="Trade Union Number")
    age: int = Field(..., ge=18, le=100, description="Age")
    father_husband_name: str = Field(..., description="Father / Husband Name")
    caste: str = Field(..., description="Caste")
    permanent_address: str = Field(..., description="Permanent Address")
    temporary_address: Optional[str] = Field(None, description="Temporary Address")
    contact_no: str = Field(..., description="Contact No.")
    monthly_salary: float = Field(..., ge=0, description="Monthly Salary")
    type_of_work: str = Field(..., description="Type of Work")
    housing_situation: str = Field(..., description="Current housing situation")
    weekly_off: str = Field(..., description="Weekly Off")
    children_studying: int = Field(default=0, ge=0, description="Number of Children studying")
    children_domestic_work: int = Field(default=0, ge=0, description="Children Working Domestic Work")
    children_other_work: int = Field(default=0, ge=0, description="Children Working other than Domestic Work")
    any_disability: Optional[str] = Field(None, description="Any Disability")
    employer_names: str = Field(..., description="Names of Employers")
    employer_address: str = Field(..., description="Address of Employers")
    employer_contact: str = Field(..., description="Contact Numbers of Employers")
    years_domestic_work: float = Field(..., ge=0, description="Number of Years in Domestic Work")
    hours_work: float = Field(..., ge=0, le=24, description="Number of Hours Work")
    aadhaar_number: str = Field(..., description="ID Proof Aadhaar Number")
    id_proof_upload: Optional[str] = Field(None, description="Upload Self attested ID Proof")
    nominee: str = Field(..., description="Nominee")
    date_joining: date = Field(..., description="Date of Joining the Trade Union")
    state: str = Field(..., description="State")
    coordinator_name: str = Field(..., description="Name of Coordinator")
    receipt_number: str = Field(..., description="Receipt Number")
    photo: Optional[str] = Field(None, description="Photo")
    number_of_houses: int = Field(default=1, ge=1, description="Number of Houses")
    nominee_contact: str = Field(..., description="Nominee contact number")
    joining_month: str = Field(..., description="Joining Month")
    
    # Computed fields
    is_active: bool = Field(default=True, description="Member active status")
    last_renewal: Optional[date] = Field(None, description="Last renewal date")
    next_renewal_due: Optional[date] = Field(None, description="Next renewal due date")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RenewalModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trade_union_number: str = Field(..., description="Trade Union Number")
    renewal_date: date = Field(..., description="Renewal Date")
    receipt_number: str = Field(..., description="Receipt Number")
    coordinator_name: str = Field(..., description="Coordinator Name")
    amount: Optional[float] = Field(None, ge=0, description="Renewal Amount")
    payment_method: Optional[str] = Field(None, description="Payment Method")
    notes: Optional[str] = Field(None, description="Additional Notes")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardStats(BaseModel):
    total_members: int
    active_members: int
    inactive_members: int
    renewals_this_month: int
    renewals_pending: int
    total_revenue: float
    avg_monthly_salary: float
    members_by_state: Dict[str, int]
    members_by_work_type: Dict[str, int]
    renewal_trends: List[Dict[str, Any]]

# ===== GOOGLE OAUTH2 FUNCTIONS =====

def create_flow():
    """Create and configure OAuth2 flow for Google authentication."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth2 credentials not configured")
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI]
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    return flow

def credentials_to_dict(credentials):
    """Convert credentials object to dictionary for session storage."""
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }

async def get_current_user(request: Request):
    """Dependency to get current authenticated user from session."""
    credentials_data = request.session.get("credentials")
    if not credentials_data:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    credentials = Credentials.from_authorized_user_info(credentials_data, SCOPES)
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                from google.auth.transport.requests import Request as GoogleRequest
                credentials.refresh(GoogleRequest())
                request.session["credentials"] = credentials_to_dict(credentials)
            except Exception as e:
                logger.error(f"Token refresh failed: {e}")
                raise HTTPException(status_code=401, detail="Token refresh failed")
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return credentials

# ===== GOOGLE SHEETS SERVICE =====

class GoogleSheetsService:
    """Service class for Google Sheets API operations."""
    
    def __init__(self, credentials: Credentials):
        self.service = build("sheets", "v4", credentials=credentials)
    
    async def import_members_from_sheet(self, spreadsheet_id: str, range_name: str = "Sheet1") -> List[Dict]:
        """Import member data from Google Sheets."""
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get("values", [])
            if not values:
                return []
            
            # Assume first row contains headers
            headers = values[0] if values else []
            members = []
            
            # Expected column mapping based on user's field list
            field_mapping = {
                "Timestamp": "timestamp",
                "Name of the town": "town_name", 
                "Name of the Member": "member_name",
                "Trade Union Number": "trade_union_number",
                "Age": "age",
                "Father / Husband Name": "father_husband_name",
                "Caste": "caste",
                "Permanent Address": "permanent_address",
                "Temporary Address": "temporary_address",
                "Contact No.": "contact_no",
                "Monthly Salary": "monthly_salary",
                "Type of Work": "type_of_work",
                "What is your current housing situation?": "housing_situation",
                "Weekly Off": "weekly_off",
                "Number of Children studying": "children_studying",
                "Number of Children Working Domestic Work": "children_domestic_work",
                "Number of Children Working other than Domestic Work": "children_other_work",
                "Any Disability": "any_disability",
                "Names of Employers": "employer_names",
                "Address of Employers": "employer_address",
                "Contact Numbers of Employers": "employer_contact",
                "Number of Years in Domestic Work": "years_domestic_work",
                "Number of Hours Work": "hours_work",
                "ID Proof Aadhaar Number": "aadhaar_number",
                "Upload Self attested ID Proof (with signature)": "id_proof_upload",
                "Nominee": "nominee",
                "Date of Joining the Trade Union": "date_joining",
                "State": "state",
                "Name of Coordinator": "coordinator_name",
                "Receipt Number": "receipt_number",
                "Photo": "photo",
                "Number of Houses": "number_of_houses",
                "Nominee contact number": "nominee_contact",
                "Joining Month": "joining_month"
            }
            
            # Create header index mapping
            header_indices = {}
            for i, header in enumerate(headers):
                if header in field_mapping:
                    header_indices[field_mapping[header]] = i
            
            # Process data rows
            for row in values[1:]:
                member_data = {}
                
                # Map each field
                for field_name, col_index in header_indices.items():
                    if col_index < len(row):
                        value = row[col_index].strip() if row[col_index] else ""
                        
                        # Type conversion for specific fields
                        if field_name in ["age", "children_studying", "children_domestic_work", "children_other_work", "number_of_houses"]:
                            try:
                                member_data[field_name] = int(value) if value else 0
                            except ValueError:
                                member_data[field_name] = 0
                        elif field_name in ["monthly_salary", "years_domestic_work", "hours_work"]:
                            try:
                                member_data[field_name] = float(value) if value else 0.0
                            except ValueError:
                                member_data[field_name] = 0.0
                        elif field_name == "date_joining":
                            try:
                                # Try to parse date - handle various formats
                                from datetime import datetime
                                if value:
                                    member_data[field_name] = datetime.strptime(value, "%Y-%m-%d").date()
                                else:
                                    member_data[field_name] = datetime.now().date()
                            except ValueError:
                                member_data[field_name] = datetime.now().date()
                        else:
                            member_data[field_name] = value
                
                # Only add if we have essential data
                if member_data.get("member_name") and member_data.get("trade_union_number"):
                    members.append(member_data)
            
            return members
            
        except HttpError as error:
            logger.error(f"Failed to import member data: {error}")
            raise HTTPException(status_code=400, detail=f"Failed to import data: {error}")
    
    async def export_renewals_to_sheet(self, spreadsheet_id: str, renewals: List[RenewalModel], range_name: str = "Renewals!A:D"):
        """Export renewal data to Google Sheets."""
        try:
            # Prepare data for export
            headers = ["Trade Union Number", "Renewal Date", "Receipt Number", "Coordinator Name"]
            values = [headers]
            
            for renewal in renewals:
                values.append([
                    renewal.trade_union_number,
                    renewal.renewal_date.strftime("%Y-%m-%d"),
                    renewal.receipt_number,
                    renewal.coordinator_name
                ])
            
            body = {"values": values}
            
            result = self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption="RAW",
                body=body
            ).execute()
            
            return result
            
        except HttpError as error:
            logger.error(f"Failed to export renewal data: {error}")
            raise HTTPException(status_code=400, detail=f"Failed to export data: {error}")

# ===== AUTHENTICATION ENDPOINTS =====

@api_router.get("/auth/login")
async def login():
    """Initiate Google OAuth2 authentication flow."""
    try:
        flow = create_flow()
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"
        )
        
        return {
            "authorization_url": authorization_url,
            "state": state,
            "message": "Visit the authorization URL to complete authentication"
        }
    except Exception as e:
        logger.error(f"Login initialization failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize authentication")

@api_router.get("/auth/google/callback")
async def auth_callback(request: Request, code: str, state: str):
    """Handle Google OAuth2 callback."""
    try:
        flow = create_flow()
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        request.session["credentials"] = credentials_to_dict(credentials)
        
        # Get user info for confirmation
        user_info_service = build("oauth2", "v2", credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        
        logger.info(f"User authenticated: {user_info.get('email')}")
        
        return {
            "status": "success",
            "message": "Authentication successful",
            "user_info": user_info
        }
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=400, detail=f"Authentication failed: {e}")

@api_router.get("/auth/user-info")
async def get_user_info(credentials: Credentials = Depends(get_current_user)):
    """Get current user information."""
    try:
        user_info_service = build("oauth2", "v2", credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        return user_info
    except Exception as e:
        logger.error(f"Failed to get user info: {e}")
        raise HTTPException(status_code=400, detail="Failed to get user information")

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout user and clear session."""
    request.session.clear()
    return {"message": "Logged out successfully"}

# ===== MEMBER MANAGEMENT ENDPOINTS =====

@api_router.post("/members/import")
async def import_members(
    spreadsheet_id: str,
    range_name: str = "Sheet1",
    credentials: Credentials = Depends(get_current_user)
):
    """Import members from Google Sheets."""
    try:
        sheets_service = GoogleSheetsService(credentials)
        members_data = await sheets_service.import_members_from_sheet(spreadsheet_id, range_name)
        
        # Save to MongoDB
        imported_count = 0
        for member_data in members_data:
            try:
                # Check if member already exists
                existing = await db.members.find_one({"trade_union_number": member_data.get("trade_union_number")})
                
                if not existing:
                    member = MemberModel(**member_data)
                    await db.members.insert_one(member.dict())
                    imported_count += 1
                else:
                    # Update existing member
                    await db.members.update_one(
                        {"trade_union_number": member_data.get("trade_union_number")},
                        {"$set": {**member_data, "updated_at": datetime.utcnow()}}
                    )
                    imported_count += 1
                    
            except Exception as e:
                logger.error(f"Error importing member {member_data.get('member_name')}: {e}")
                continue
        
        return {
            "message": f"Successfully imported {imported_count} members",
            "imported_count": imported_count,
            "total_found": len(members_data)
        }
        
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/members", response_model=List[MemberModel])
async def get_members(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    state: Optional[str] = None,
    active_only: bool = True
):
    """Get members with filtering and pagination."""
    try:
        query = {}
        
        if active_only:
            query["is_active"] = True
            
        if state:
            query["state"] = state
            
        if search:
            query["$or"] = [
                {"member_name": {"$regex": search, "$options": "i"}},
                {"trade_union_number": {"$regex": search, "$options": "i"}},
                {"contact_no": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = db.members.find(query).skip(skip).limit(limit)
        members = await cursor.to_list(length=limit)
        
        return [MemberModel(**member) for member in members]
        
    except Exception as e:
        logger.error(f"Failed to fetch members: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch members")

@api_router.get("/members/{member_id}", response_model=MemberModel)
async def get_member(member_id: str):
    """Get specific member by ID."""
    try:
        member = await db.members.find_one({"id": member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        return MemberModel(**member)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch member: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch member")

@api_router.put("/members/{member_id}", response_model=MemberModel)
async def update_member(member_id: str, member_update: MemberModel):
    """Update member information."""
    try:
        member_update.updated_at = datetime.utcnow()
        
        result = await db.members.update_one(
            {"id": member_id},
            {"$set": member_update.dict()}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Member not found")
        
        updated_member = await db.members.find_one({"id": member_id})
        return MemberModel(**updated_member)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update member: {e}")
        raise HTTPException(status_code=500, detail="Failed to update member")

# ===== RENEWAL MANAGEMENT ENDPOINTS =====

@api_router.post("/renewals", response_model=RenewalModel)
async def create_renewal(renewal: RenewalModel):
    """Create a new renewal record."""
    try:
        # Check if member exists
        member = await db.members.find_one({"trade_union_number": renewal.trade_union_number})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found with this trade union number")
        
        # Save renewal
        await db.renewals.insert_one(renewal.dict())
        
        # Update member's last renewal date
        await db.members.update_one(
            {"trade_union_number": renewal.trade_union_number},
            {"$set": {"last_renewal": renewal.renewal_date, "updated_at": datetime.utcnow()}}
        )
        
        return renewal
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create renewal: {e}")
        raise HTTPException(status_code=500, detail="Failed to create renewal")

@api_router.get("/renewals", response_model=List[RenewalModel])
async def get_renewals(
    skip: int = 0,
    limit: int = 100,
    trade_union_number: Optional[str] = None,
    coordinator: Optional[str] = None
):
    """Get renewals with filtering and pagination."""
    try:
        query = {}
        
        if trade_union_number:
            query["trade_union_number"] = trade_union_number
            
        if coordinator:
            query["coordinator_name"] = {"$regex": coordinator, "$options": "i"}
        
        cursor = db.renewals.find(query).skip(skip).limit(limit).sort("renewal_date", -1)
        renewals = await cursor.to_list(length=limit)
        
        return [RenewalModel(**renewal) for renewal in renewals]
        
    except Exception as e:
        logger.error(f"Failed to fetch renewals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch renewals")

@api_router.post("/renewals/export")
async def export_renewals(
    spreadsheet_id: str,
    range_name: str = "Renewals!A:D",
    credentials: Credentials = Depends(get_current_user)
):
    """Export renewals to Google Sheets."""
    try:
        # Get all renewals
        renewals_data = await db.renewals.find().to_list(length=1000)
        renewals = [RenewalModel(**renewal) for renewal in renewals_data]
        
        # Export to Google Sheets
        sheets_service = GoogleSheetsService(credentials)
        result = await sheets_service.export_renewals_to_sheet(spreadsheet_id, renewals, range_name)
        
        return {
            "message": f"Successfully exported {len(renewals)} renewals",
            "exported_count": len(renewals),
            "updated_cells": result.get("updatedCells", 0)
        }
        
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ===== DASHBOARD ENDPOINTS =====

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics."""
    try:
        # Get member counts
        total_members = await db.members.count_documents({})
        active_members = await db.members.count_documents({"is_active": True})
        inactive_members = total_members - active_members
        
        # Get renewal counts for this month
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        renewals_this_month = await db.renewals.count_documents({
            "renewal_date": {"$gte": start_of_month}
        })
        
        # Calculate pending renewals (members without renewal in last 12 months)
        one_year_ago = now - timedelta(days=365)
        renewals_pending = await db.members.count_documents({
            "is_active": True,
            "$or": [
                {"last_renewal": {"$lt": one_year_ago}},
                {"last_renewal": None}
            ]
        })
        
        # Calculate revenue from renewals with amounts
        pipeline = [
            {"$match": {"amount": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        revenue_result = await db.renewals.aggregate(pipeline).to_list(length=1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0.0
        
        # Calculate average monthly salary
        salary_pipeline = [
            {"$match": {"monthly_salary": {"$gt": 0}}},
            {"$group": {"_id": None, "avg_salary": {"$avg": "$monthly_salary"}}}
        ]
        salary_result = await db.members.aggregate(salary_pipeline).to_list(length=1)
        avg_monthly_salary = salary_result[0]["avg_salary"] if salary_result else 0.0
        
        # Members by state
        state_pipeline = [
            {"$group": {"_id": "$state", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        state_results = await db.members.aggregate(state_pipeline).to_list(length=20)
        members_by_state = {result["_id"]: result["count"] for result in state_results}
        
        # Members by work type
        work_pipeline = [
            {"$group": {"_id": "$type_of_work", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        work_results = await db.members.aggregate(work_pipeline).to_list(length=20)
        members_by_work_type = {result["_id"]: result["count"] for result in work_results}
        
        # Renewal trends (last 6 months)
        renewal_trends = []
        for i in range(6):
            month_start = (now - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i == 0:
                month_end = now
            else:
                month_end = (now - timedelta(days=30*(i-1))).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            count = await db.renewals.count_documents({
                "renewal_date": {"$gte": month_start, "$lt": month_end}
            })
            
            renewal_trends.append({
                "month": month_start.strftime("%Y-%m"),
                "count": count
            })
        
        renewal_trends.reverse()  # Show oldest to newest
        
        return DashboardStats(
            total_members=total_members,
            active_members=active_members,
            inactive_members=inactive_members,
            renewals_this_month=renewals_this_month,
            renewals_pending=renewals_pending,
            total_revenue=total_revenue,
            avg_monthly_salary=avg_monthly_salary,
            members_by_state=members_by_state,
            members_by_work_type=members_by_work_type,
            renewal_trends=renewal_trends
        )
        
    except Exception as e:
        logger.error(f"Failed to get dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard statistics")

# ===== BASIC ENDPOINTS =====

@api_router.get("/")
async def root():
    return {"message": "Trade Union MIS API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

# Database connection events
@app.on_event("startup")
async def startup_event():
    logger.info("Trade Union MIS API starting up...")
    # Create indexes for better performance
    await db.members.create_index("trade_union_number", unique=True)
    await db.members.create_index("member_name")
    await db.members.create_index("state")
    await db.renewals.create_index("trade_union_number")
    await db.renewals.create_index("renewal_date")
    logger.info("Database indexes created successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Trade Union MIS API...")
    client.close()