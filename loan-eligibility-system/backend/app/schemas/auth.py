from datetime import date, timedelta

from pydantic import BaseModel, EmailStr, Field, field_validator


class ApplicantRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    date_of_birth: date
    address: str | None = Field(default=None, max_length=255)

    @field_validator("date_of_birth")
    @classmethod
    def must_be_adult(cls, value: date) -> date:
        eighteen_years_ago = date.today() - timedelta(days=18 * 365.25)
        if value > eighteen_years_ago:
            raise ValueError("Applicant must be at least 18 years old.")
        if value < date(1900, 1, 1):
            raise ValueError("Date of birth is not valid.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    role: str

    class Config:
        from_attributes = True
