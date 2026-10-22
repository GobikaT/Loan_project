from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, ForeignKey, DateTime, BigInteger, Boolean, Text, func, Enum as SAEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import DocumentType, OcrStatus


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    uploaded_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application = relationship("LoanApplication", back_populates="documents")
    ocr_result = relationship("OcrResult", back_populates="document", uselist=False, cascade="all, delete-orphan")


class OcrResult(Base):
    __tablename__ = "ocr_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    raw_extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_document_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ocr_confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    ocr_engine: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[OcrStatus] = mapped_column(SAEnum(OcrStatus), default=OcrStatus.PENDING, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="ocr_result")
    extracted_fields = relationship("ExtractedField", back_populates="ocr_result", cascade="all, delete-orphan")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ocr_result_id: Mapped[int] = mapped_column(ForeignKey("ocr_results.id", ondelete="CASCADE"), nullable=False)
    raw_label: Mapped[str | None] = mapped_column(String(150), nullable=True)
    normalized_field: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    extracted_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mapping_confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    mapping_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    needs_verification: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    ocr_result = relationship("OcrResult", back_populates="extracted_fields")
